import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { InputWithScan } from './ui/InputWithScan';
import { ProjectIdInput } from './ui/ProjectIdInput';
import { validateConfiguration, buildConfiguration } from '../utils/configValidation';
import { handleQRScanResult, QRScanField } from '../utils/qrScanHandlers';

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
  const [qrScanField, setQrScanField] = useState<QRScanField | null>(null);
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


  const handleSendConfiguration = async () => {
    const validation = validateConfiguration(wifiSSID, wifiPassword, togglToken, workspaceId, projectIds);
    if (!validation.isValid) {
      Alert.alert('Configuration Error', validation.error!);
      return;
    }

    if (!bleService.isConnected()) {
      Alert.alert('Connection Error', 'Device is not connected');
      return;
    }

    setIsSending(true);

    try {
      const config = buildConfiguration(wifiSSID, wifiPassword, togglToken, workspaceId, projectIds);
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

  const handleQRScanRequest = (field: QRScanField) => {
    setQrScanField(field);
    setShowQRScanner(true);
  };

  const onQRScanResult = (data: string) => {
    setShowQRScanner(false);
    
    if (qrScanField) {
      handleQRScanResult(data, qrScanField, {
        setWifiPassword,
        setTogglToken,
        setWorkspaceId,
        updateProjectId,
        setProjectIds,
      }, projectIds);
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
          
          <InputWithScan
            label="Network Name (SSID)"
            required
            value={wifiSSID}
            onChangeText={setWifiSSID}
            placeholder="Enter WiFi network name"
            onScan={() => setShowWiFiPicker(true)}
            scanButtonText="📶 Browse"
          />

          <InputWithScan
            label="WiFi Password"
            required
            value={wifiPassword}
            onChangeText={setWifiPassword}
            placeholder="Enter WiFi password"
            secureTextEntry
            onScan={() => handleQRScanRequest('wifi-password')}
          />
        </View>

        {/* Toggl Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Toggl Integration</Text>
          
          <InputWithScan
            label="API Token"
            required
            value={togglToken}
            onChangeText={setTogglToken}
            placeholder="Enter Toggl API token"
            secureTextEntry
            onScan={() => handleQRScanRequest('toggl-token')}
          />

          <InputWithScan
            label="Workspace ID"
            required
            value={workspaceId}
            onChangeText={setWorkspaceId}
            placeholder="Enter workspace ID (number)"
            keyboardType="numeric"
            onScan={() => handleQRScanRequest('workspace-id')}
          />
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
            <ProjectIdInput
              label="Face Down"
              value={projectIds.faceDown}
              onValueChange={(value) => updateProjectId('faceDown', value)}
              onScan={() => handleQRScanRequest('face-down')}
            />

            <ProjectIdInput
              label="Left Side"
              value={projectIds.leftSide}
              onValueChange={(value) => updateProjectId('leftSide', value)}
              onScan={() => handleQRScanRequest('left-side')}
            />

            <ProjectIdInput
              label="Right Side"
              value={projectIds.rightSide}
              onValueChange={(value) => updateProjectId('rightSide', value)}
              onScan={() => handleQRScanRequest('right-side')}
            />

            <ProjectIdInput
              label="Front Edge"
              value={projectIds.frontEdge}
              onValueChange={(value) => updateProjectId('frontEdge', value)}
              onScan={() => handleQRScanRequest('front-edge')}
            />

            <ProjectIdInput
              label="Back Edge"
              value={projectIds.backEdge}
              onValueChange={(value) => updateProjectId('backEdge', value)}
              onScan={() => handleQRScanRequest('back-edge')}
            />
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
          onQRScanned={onQRScanResult}
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
  orientationGrid: {
    gap: 16,
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