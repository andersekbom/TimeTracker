import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from 'react-native';
import { TimeTrackerBLEService } from '../services/BLEService';
import { TimeTrackerConfiguration } from '../types/TimeTrackerBLE';
import { QRCodeScanner } from './QRCodeScanner';
import { WiFiNetworkPicker } from './WiFiNetworkPicker';

interface TimeTrackerConfigProps {
  deviceName: string;
  onConfigurationSent: () => void;
  onBack: () => void;
}

export const TimeTrackerConfig: React.FC<TimeTrackerConfigProps> = ({
  deviceName,
  onConfigurationSent,
  onBack,
}) => {
  // WiFi Configuration
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');

  // Toggl Configuration
  const [togglToken, setTogglToken] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');

  // Project IDs for each orientation
  const [projectIds, setProjectIds] = useState({
    faceDown: 0,
    leftSide: 0,
    rightSide: 0,
    frontEdge: 0,
    backEdge: 0,
  });

  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanField, setQrScanField] = useState<'wifi-password' | 'toggl-token' | 'workspace-id' | 'project-ids' | 'face-down' | 'left-side' | 'right-side' | 'front-edge' | 'back-edge' | null>(null);
  const [showWiFiPicker, setShowWiFiPicker] = useState(false);
  const [bleService] = useState(() => TimeTrackerBLEService.getInstance());

  // Monitor BLE connection state
  useEffect(() => {
    const handleConnectionStateChange = (connected: boolean, deviceName?: string) => {
      if (!connected) {
        Alert.alert(
          'Connection Lost',
          'The connection to the TimeTracker device was lost. Please go back and reconnect.',
          [
            {
              text: 'Go Back',
              onPress: onBack,
            }
          ]
        );
      }
    };

    bleService.onConnectionStateChange(handleConnectionStateChange);

    return () => {
      bleService.removeConnectionStateCallback(handleConnectionStateChange);
    };
  }, [bleService, onBack]);

  // Load existing configuration when component mounts
  useEffect(() => {
    const loadExistingConfiguration = async () => {
      setIsLoading(true);
      try {
        const existingConfig = await bleService.readConfiguration();
        if (existingConfig) {
          // Populate the form fields with existing configuration
          setWifiSSID(existingConfig.wifi.ssid);
          setWifiPassword(existingConfig.wifi.password);
          setTogglToken(existingConfig.toggl.apiToken);
          setWorkspaceId(existingConfig.toggl.workspaceId);
          setProjectIds(existingConfig.projects);
          
          console.log('Loaded existing configuration:', existingConfig);
        } else {
          console.log('No existing configuration found on device');
        }
      } catch (error) {
        console.warn('Failed to load existing configuration:', error);
        // Don't show error to user, just continue with empty form
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingConfiguration();
  }, [bleService]);

  const validateConfiguration = (): string | null => {
    if (!wifiSSID.trim()) return 'WiFi SSID is required';
    if (!wifiPassword.trim()) return 'WiFi password is required';
    if (!togglToken.trim()) return 'Toggl API token is required';
    if (!workspaceId.trim()) return 'Workspace ID is required';
    
    const workspaceNum = parseInt(workspaceId);
    if (isNaN(workspaceNum)) return 'Workspace ID must be a number';
    
    // Check that at least one project ID is set
    const hasProjects = Object.values(projectIds).some(id => id > 0);
    if (!hasProjects) return 'At least one project ID must be set';
    
    return null;
  };

  const handleSendConfiguration = async () => {
    const validationError = validateConfiguration();
    if (validationError) {
      Alert.alert('Configuration Error', validationError);
      return;
    }

    if (!bleService.isConnected()) {
      Alert.alert('Connection Error', 'Device is not connected');
      return;
    }

    setIsSending(true);

    try {
      const config: TimeTrackerConfiguration = {
        wifi: {
          ssid: wifiSSID.trim(),
          password: wifiPassword.trim(),
        },
        toggl: {
          apiToken: togglToken.trim(),
          workspaceId: workspaceId.trim(),
        },
        projects: projectIds,
      };

      await bleService.sendConfiguration(config);
      
      Alert.alert(
        'Configuration Sent',
        'Configuration has been sent to the TimeTracker device successfully!',
        [
          {
            text: 'OK',
            onPress: onConfigurationSent,
          },
        ]
      );
    } catch (error) {
      Alert.alert('Configuration Failed', `Failed to send configuration: ${error}`);
    } finally {
      setIsSending(false);
    }
  };

  const updateProjectId = (orientation: keyof typeof projectIds, value: string) => {
    const numValue = parseInt(value) || 0;
    setProjectIds(prev => ({
      ...prev,
      [orientation]: numValue,
    }));
  };

  const handleQRScanRequest = (field: 'wifi-password' | 'toggl-token' | 'workspace-id' | 'project-ids' | 'face-down' | 'left-side' | 'right-side' | 'front-edge' | 'back-edge') => {
    setQrScanField(field);
    setShowQRScanner(true);
  };

  const handleQRScanResult = (data: string) => {
    setShowQRScanner(false);
    
    try {
      if (qrScanField === 'wifi-password') {
        setWifiPassword(data);
        Alert.alert('Success', 'WiFi password scanned successfully!');
      } else if (qrScanField === 'toggl-token') {
        setTogglToken(data);
        Alert.alert('Success', 'Toggl API token scanned successfully!');
      } else if (qrScanField === 'workspace-id') {
        // Validate that it's a number
        const workspaceNum = parseInt(data.trim());
        if (isNaN(workspaceNum)) {
          Alert.alert('Error', 'Scanned data is not a valid workspace ID (must be a number)');
        } else {
          setWorkspaceId(data.trim());
          Alert.alert('Success', 'Workspace ID scanned successfully!');
        }
      } else if (qrScanField === 'face-down') {
        const projectId = parseInt(data.trim());
        if (isNaN(projectId)) {
          Alert.alert('Error', 'Scanned data is not a valid project ID (must be a number)');
        } else {
          updateProjectId('faceDown', data.trim());
          Alert.alert('Success', 'Face Down project ID scanned successfully!');
        }
      } else if (qrScanField === 'left-side') {
        const projectId = parseInt(data.trim());
        if (isNaN(projectId)) {
          Alert.alert('Error', 'Scanned data is not a valid project ID (must be a number)');
        } else {
          updateProjectId('leftSide', data.trim());
          Alert.alert('Success', 'Left Side project ID scanned successfully!');
        }
      } else if (qrScanField === 'right-side') {
        const projectId = parseInt(data.trim());
        if (isNaN(projectId)) {
          Alert.alert('Error', 'Scanned data is not a valid project ID (must be a number)');
        } else {
          updateProjectId('rightSide', data.trim());
          Alert.alert('Success', 'Right Side project ID scanned successfully!');
        }
      } else if (qrScanField === 'front-edge') {
        const projectId = parseInt(data.trim());
        if (isNaN(projectId)) {
          Alert.alert('Error', 'Scanned data is not a valid project ID (must be a number)');
        } else {
          updateProjectId('frontEdge', data.trim());
          Alert.alert('Success', 'Front Edge project ID scanned successfully!');
        }
      } else if (qrScanField === 'back-edge') {
        const projectId = parseInt(data.trim());
        if (isNaN(projectId)) {
          Alert.alert('Error', 'Scanned data is not a valid project ID (must be a number)');
        } else {
          updateProjectId('backEdge', data.trim());
          Alert.alert('Success', 'Back Edge project ID scanned successfully!');
        }
      } else if (qrScanField === 'project-ids') {
        // Try to parse as JSON array or comma-separated values
        try {
          let projectArray: number[] = [];
          
          // Try parsing as JSON first
          if (data.trim().startsWith('[')) {
            projectArray = JSON.parse(data);
          } else {
            // Try parsing as comma-separated values
            projectArray = data.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          }
          
          if (projectArray.length === 0) {
            Alert.alert('Error', 'No valid project IDs found in scanned data');
          } else {
            // Update project IDs (up to 5 values for the 5 orientations)
            const orientations: (keyof typeof projectIds)[] = ['faceDown', 'leftSide', 'rightSide', 'frontEdge', 'backEdge'];
            const updatedProjectIds = { ...projectIds };
            
            orientations.forEach((orientation, index) => {
              if (index < projectArray.length) {
                updatedProjectIds[orientation] = projectArray[index];
              }
            });
            
            setProjectIds(updatedProjectIds);
            Alert.alert('Success', `${Math.min(projectArray.length, 5)} project IDs scanned successfully!`);
          }
        } catch (error) {
          Alert.alert('Error', 'Could not parse project IDs from scanned data. Expected format: [1234,5678,9012] or 1234,5678,9012');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process scanned data');
    }
    
    setQrScanField(null);
  };

  const handleWiFiNetworkSelection = (ssid: string) => {
    setWifiSSID(ssid);
    setShowWiFiPicker(false);
    Alert.alert('Network Selected', `Selected: ${ssid}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading existing configuration...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Configure {deviceName}</Text>
          </View>

        {/* WiFi Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WiFi Configuration</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Network Name (SSID) *</Text>
            <View style={styles.inputWithButton}>
              <TextInput
                style={[styles.input, styles.inputWithButtonText]}
                value={wifiSSID}
                onChangeText={setWifiSSID}
                placeholder="Enter WiFi network name"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => setShowWiFiPicker(true)}
              >
                <Text style={styles.scanButtonText}>📶 Browse</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>WiFi Password *</Text>
            <View style={styles.inputWithButton}>
              <TextInput
                style={[styles.input, styles.inputWithButtonText]}
                value={wifiPassword}
                onChangeText={setWifiPassword}
                placeholder="Enter WiFi password"
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => handleQRScanRequest('wifi-password')}
              >
                <Text style={styles.scanButtonText}>📱 Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Toggl Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Toggl Integration</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>API Token *</Text>
            <View style={styles.inputWithButton}>
              <TextInput
                style={[styles.input, styles.inputWithButtonText]}
                value={togglToken}
                onChangeText={setTogglToken}
                placeholder="Enter Toggl API token"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={true}
              />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => handleQRScanRequest('toggl-token')}
              >
                <Text style={styles.scanButtonText}>📱 Scan</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Workspace ID *</Text>
            <View style={styles.inputWithButton}>
              <TextInput
                style={[styles.input, styles.inputWithButtonText]}
                value={workspaceId}
                onChangeText={setWorkspaceId}
                placeholder="Enter workspace ID (number)"
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => handleQRScanRequest('workspace-id')}
              >
                <Text style={styles.scanButtonText}>📱 Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Project Mapping */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Cube Orientation Projects</Text>
              <Text style={styles.sectionSubtitle}>
                Map each cube orientation to a Toggl project ID
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sectionScanButton}
              onPress={() => handleQRScanRequest('project-ids')}
            >
              <Text style={styles.sectionScanButtonText}>📱 Scan All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.orientationGrid}>
            <View style={styles.orientationItem}>
              <Text style={styles.orientationLabel}>Face Down</Text>
              <View style={styles.orientationInputContainer}>
                <TextInput
                  style={styles.orientationInput}
                  value={projectIds.faceDown.toString()}
                  onChangeText={(value) => updateProjectId('faceDown', value)}
                  placeholder="Project ID"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.orientationScanButton}
                  onPress={() => handleQRScanRequest('face-down')}
                >
                  <Text style={styles.orientationScanButtonText}>📱</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.orientationItem}>
              <Text style={styles.orientationLabel}>Left Side</Text>
              <View style={styles.orientationInputContainer}>
                <TextInput
                  style={styles.orientationInput}
                  value={projectIds.leftSide.toString()}
                  onChangeText={(value) => updateProjectId('leftSide', value)}
                  placeholder="Project ID"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.orientationScanButton}
                  onPress={() => handleQRScanRequest('left-side')}
                >
                  <Text style={styles.orientationScanButtonText}>📱</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.orientationItem}>
              <Text style={styles.orientationLabel}>Right Side</Text>
              <View style={styles.orientationInputContainer}>
                <TextInput
                  style={styles.orientationInput}
                  value={projectIds.rightSide.toString()}
                  onChangeText={(value) => updateProjectId('rightSide', value)}
                  placeholder="Project ID"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.orientationScanButton}
                  onPress={() => handleQRScanRequest('right-side')}
                >
                  <Text style={styles.orientationScanButtonText}>📱</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.orientationItem}>
              <Text style={styles.orientationLabel}>Front Edge</Text>
              <View style={styles.orientationInputContainer}>
                <TextInput
                  style={styles.orientationInput}
                  value={projectIds.frontEdge.toString()}
                  onChangeText={(value) => updateProjectId('frontEdge', value)}
                  placeholder="Project ID"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.orientationScanButton}
                  onPress={() => handleQRScanRequest('front-edge')}
                >
                  <Text style={styles.orientationScanButtonText}>📱</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.orientationItem}>
              <Text style={styles.orientationLabel}>Back Edge</Text>
              <View style={styles.orientationInputContainer}>
                <TextInput
                  style={styles.orientationInput}
                  value={projectIds.backEdge.toString()}
                  onChangeText={(value) => updateProjectId('backEdge', value)}
                  placeholder="Project ID"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.orientationScanButton}
                  onPress={() => handleQRScanRequest('back-edge')}
                >
                  <Text style={styles.orientationScanButtonText}>📱</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Send Configuration Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={handleSendConfiguration}
            disabled={isSending}
          >
            {isSending ? (
              <View style={styles.buttonLoadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.sendButtonText}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.sendButtonText}>Save Configuration</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* QR Code Scanner Modal */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <QRCodeScanner
          onQRScanned={handleQRScanResult}
          onClose={() => {
            setShowQRScanner(false);
            setQrScanField(null);
          }}
          title={
            qrScanField === 'wifi-password' ? 'Scan WiFi Password' :
            qrScanField === 'toggl-token' ? 'Scan Toggl API Token' :
            qrScanField === 'workspace-id' ? 'Scan Workspace ID' :
            qrScanField === 'project-ids' ? 'Scan All Project IDs' :
            qrScanField === 'face-down' ? 'Scan Face Down Project ID' :
            qrScanField === 'left-side' ? 'Scan Left Side Project ID' :
            qrScanField === 'right-side' ? 'Scan Right Side Project ID' :
            qrScanField === 'front-edge' ? 'Scan Front Edge Project ID' :
            qrScanField === 'back-edge' ? 'Scan Back Edge Project ID' :
            'Scan QR Code'
          }
        />
      </Modal>

      {/* WiFi Network Picker Modal */}
      <Modal
        visible={showWiFiPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1 }}>
          <WiFiNetworkPicker
            onNetworkSelected={handleWiFiNetworkSelection}
            onClose={() => setShowWiFiPicker(false)}
            currentSSID={wifiSSID}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionScanButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  sectionScanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  inputWithButtonText: {
    flex: 1,
  },
  scanButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  orientationGrid: {
    gap: 16,
  },
  orientationItem: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  orientationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  orientationDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  orientationInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  orientationInputContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  orientationScanButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
  },
  orientationScanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  orientationInputDisabled: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
  },
  orientationInputText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#333333',
    marginTop: 16,
    textAlign: 'center',
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});