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
import { providerStorage } from '../services/ProviderStorage';
import { providerRegistry } from '../services/ProviderRegistry';
import { ProviderConfiguration } from '../types/TimeTrackingProvider';
import { validateConfiguration, buildConfiguration } from '../utils/configValidation';
import { Picker } from '@react-native-picker/picker';

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
  const [wifiSSID, setWifiSSID] = useState('eichbaum');
  const [wifiPassword, setWifiPassword] = useState('zooweedoobee');

  // Provider Configuration from Setup
  const [providerConfig, setProviderConfig] = useState<ProviderConfiguration | null>(null);
  const [togglToken, setTogglToken] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [testingToggl, setTestingToggl] = useState(false);
  const [togglValid, setTogglValid] = useState<boolean | null>(null);
  const [hasProviderSetup, setHasProviderSetup] = useState(false);

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

  // Load provider configuration and existing device configuration
  useEffect(() => {
    const loadConfigurations = async () => {
      setIsLoading(true);
      try {
        // First, load provider configuration from Setup
        const storedProviderConfig = await providerStorage.loadConfiguration();
        if (storedProviderConfig) {
          setProviderConfig(storedProviderConfig);
          setHasProviderSetup(true);
          
          // Use provider configuration to pre-fill Toggl fields
          const provider = providerRegistry.getProvider(storedProviderConfig.providerId);
          if (provider) {
            const deviceConfig = provider.buildDeviceConfiguration(storedProviderConfig);
            if (deviceConfig.toggl) {
              setTogglToken(deviceConfig.toggl.apiToken || '');
              setWorkspaceId(String(deviceConfig.toggl.workspaceId || ''));
            }
            if (deviceConfig.projects) {
              setProjectIds({
                faceDown: deviceConfig.projects.faceDown || 0,
                leftSide: deviceConfig.projects.leftSide || 0,
                rightSide: deviceConfig.projects.rightSide || 0,
                frontEdge: deviceConfig.projects.frontEdge || 0,
                backEdge: deviceConfig.projects.backEdge || 0,
              });
            }
          }
          console.log('Loaded provider configuration from Setup:', storedProviderConfig);
        } else {
          console.log('No provider configuration found - user needs to run Setup first');
        }

        // Then try to load existing device configuration (mainly for WiFi settings)
        const existingConfig = await bleService.readConfiguration();
        if (existingConfig) {
          setWifiSSID(existingConfig.wifi.ssid);
          setWifiPassword(existingConfig.wifi.password);
          
          // Only use device Toggl config if no provider setup exists
          if (!storedProviderConfig) {
            setTogglToken(existingConfig.toggl.apiToken);
            setWorkspaceId(existingConfig.toggl.workspaceId);
            setProjectIds(existingConfig.projects);
          }
          
          console.log('Loaded existing device configuration:', existingConfig);
        } else {
          console.log('No existing device configuration found');
        }
      } catch (error) {
        console.warn('Failed to load configurations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfigurations();
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
      
      // Subscribe to status updates to monitor configuration progress
      const statusPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Configuration timeout - no success confirmation received'));
        }, 15000); // 15 second timeout
        
        bleService.subscribeToStatus(
          (status) => {
            console.log('Device status update:', status);
            if (status === 'config_success') {
              clearTimeout(timeout);
              console.log('Configuration confirmed successful by device!');
              resolve();
            }
          },
          (error) => {
            clearTimeout(timeout);
            reject(error);
          }
        ).catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      // Send configuration and wait for device confirmation
      await bleService.sendConfiguration(config);
      console.log('Configuration sent, waiting for device confirmation...');
      
      // Wait for device to confirm successful configuration
      await statusPromise;
      
      Alert.alert(
        'Configuration Complete',
        'Your TimeTracker device has been configured successfully and is now connecting to WiFi!',
        [
          {
            text: 'Done',
            onPress: () => {
              // Give device time to start WiFi before potential disconnection
              setTimeout(() => {
                onConfigurationSent();
              }, 1000);
            },
          },
        ]
      );
      
    } catch (error) {
      console.error('Configuration error:', error);
      Alert.alert('Configuration Failed', `Failed to configure device: ${error}`);
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

          {/* Provider Setup Warning */}
          {!hasProviderSetup && (
            <View style={styles.warningSection}>
              <Text style={styles.warningTitle}>⚠️ Setup Required</Text>
              <Text style={styles.warningText}>
                No time tracking service has been configured. Please go back and use the "Setup" button to configure your time tracking provider (Toggl, etc.) first.
              </Text>
              <Text style={styles.warningSubtext}>
                You can still configure WiFi settings and send basic configuration to the device.
              </Text>
            </View>
          )}

          {/* Provider Configuration Info */}
          {hasProviderSetup && providerConfig && (
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>✅ Time Tracking Setup Complete</Text>
              <Text style={styles.infoText}>
                Using {providerRegistry.getProvider(providerConfig.providerId)?.name} with workspace {providerConfig.workspaceId}
              </Text>
            </View>
          )}

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
        <TouchableOpacity
          style={styles.testButton}
          onPress={async () => {
            setTestingToggl(true);
            const result = await validateTogglCredentials(togglToken, workspaceId);
            setTestingToggl(false);
            setTogglValid(result.isValid);
          }}
          disabled={testingToggl}
        >
          {testingToggl ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.testButtonText}>Test Toggl Credentials</Text>
          )}
        </TouchableOpacity>
        {togglValid !== null && (
          <View style={styles.validationResult}>
            <Text style={togglValid ? styles.valid : styles.invalid}>
              {togglValid ? '✓' : '✕'}
            </Text>
          </View>
        )}
        </View>

        {/* Project Mapping */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>

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
  testButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  validationResult: {
    alignItems: 'center',
    marginTop: 8,
  },
  valid: {
    color: 'green',
    fontSize: 24,
  },
  invalid: {
    color: 'red',
    fontSize: 24,
  },
  warningSection: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    margin: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
    lineHeight: 20,
  },
  warningSubtext: {
    fontSize: 12,
    color: '#856404',
    fontStyle: 'italic',
  },
  infoSection: {
    backgroundColor: '#D4EDDA',
    borderColor: '#C3E6CB',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    margin: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
});
