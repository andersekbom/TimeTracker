import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { TimeTrackerBLEService } from '../services/BLEService';
import { TimeTrackerDevice } from '../types/TimeTrackerBLE';
import { providerStorage } from '../services/ProviderStorage';

interface BLEScannerProps {
  onDeviceSelected?: (device: TimeTrackerDevice) => void;
  onConnected: (deviceName: string) => void;
  onDisconnected: () => void;
  onError: (error: string) => void;
  onStartConfiguration: () => void;
  onSetupTimeTracking?: () => void;
  onShowHelp?: () => void;
  selectedDevice: TimeTrackerDevice | null;
  connectedDeviceName: string;
  isConnected: boolean;
}

export const BLEScanner: React.FC<BLEScannerProps> = ({ 
  onDeviceSelected, 
  onConnected, 
  onDisconnected, 
  onError, 
  onStartConfiguration, 
  onSetupTimeTracking,
  onShowHelp,
  selectedDevice, 
  connectedDeviceName, 
  isConnected 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<TimeTrackerDevice[]>([]);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [hasProviderSetup, setHasProviderSetup] = useState(false);
  const [isLoadingProviderStatus, setIsLoadingProviderStatus] = useState(true);
  const [connectionUpdateTrigger, setConnectionUpdateTrigger] = useState(0); // Used to trigger re-renders when BLE state changes
  const [bleService] = useState(() => TimeTrackerBLEService.getInstance());

  // Check if provider is configured on mount and when component updates
  useEffect(() => {
    const checkProviderSetup = async () => {
      setIsLoadingProviderStatus(true);
      try {
        const providerConfig = await providerStorage.loadConfiguration();
        const hasProvider = !!providerConfig;
        console.log('Provider setup status:', hasProvider ? 'configured' : 'not configured');
        setHasProviderSetup(hasProvider);
      } catch (error) {
        console.error('Error checking provider setup:', error);
        setHasProviderSetup(false);
      } finally {
        setIsLoadingProviderStatus(false);
      }
    };
    
    checkProviderSetup();
  }, []); // Dependencies removed to allow manual refresh via key prop

  useEffect(() => {
    // Subscribe to connection state changes
      const handleConnectionStateChange = (connected: boolean, deviceName?: string) => {
      setConnectingDeviceId(null);
      
      if (__DEV__) {
        console.log(`BLE connection state changed: connected=${connected}, deviceName=${deviceName || 'null'}`);
      }
      
      // Trigger re-render of device list to update button states
      setConnectionUpdateTrigger(prev => prev + 1);

      if (connected && deviceName) {
        onConnected(deviceName);
      } else {
        onDisconnected();
        // Don't auto-add disconnected devices - user must scan to see devices
      }
    };

    bleService.onConnectionStateChange(handleConnectionStateChange);

    // Don't auto-populate device list on mount - wait for user to scan

    return () => {
      // Clean up the specific callback when unmounting
      bleService.removeConnectionStateCallback(handleConnectionStateChange);
      // Don't destroy the singleton service, just stop scanning
      bleService.stopScan();
    };
  }, [bleService, onConnected, onDisconnected, isConnected, connectedDeviceName, selectedDevice]);

  // Don't auto-populate device list - user must explicitly scan

  const startScan = async () => {
    if (!hasProviderSetup) {
      Alert.alert('Setup Required', 'Please set up a time tracking provider first before scanning for devices.');
      return;
    }
    
    try {
      setIsScanning(true);
      
      // Clear existing devices to show fresh scan results
      setDevices([]);
      
      // Debug logging for connection state at scan start
      if (__DEV__) {
        const connectedDevice = bleService.getConnectedDevice();
        console.log(`Starting scan - BLE service connection state: ${connectedDevice?.name || 'null'} (${connectedDevice?.id.substring(0,8) || 'null'}...), parent props: isConnected=${isConnected}, connectedDeviceName=${connectedDeviceName}`);
      }
      
      await bleService.scanForDevices(
        (device) => {
          if (__DEV__) {
            console.log(`Found device: ${device.name} (${device.id.substring(0,8)}...)`);
          }
          setDevices(prev => {
            // Avoid duplicates
            if (prev.find(d => d.id === device.id)) {
              if (__DEV__) {
                console.log(`Skipping duplicate device: ${device.name}`);
              }
              return prev;
            }
            if (__DEV__) {
              console.log(`Adding new device to list: ${device.name}`);
            }
            return [...prev, device];
          });
        },
        (error) => {
          console.error('Scan error:', error);
          Alert.alert('Scan Error', error.message);
        }
      );

      // Stop scanning after 10 seconds
      setTimeout(() => {
        stopScan();
      }, 10000);

    } catch (error) {
      Alert.alert('Error', `Failed to start scan: ${error}`);
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    bleService.stopScan();
    setIsScanning(false);
  };

  const handleConnect = async (device: TimeTrackerDevice) => {
    setConnectingDeviceId(device.id);
    
    try {
      // Set the selected device first
      onDeviceSelected?.(device);
      await bleService.connectToDevice(device.id);
      // Connection state will be updated via callback
    } catch (error) {
      setConnectingDeviceId(null);
      const errorMessage = `Connection failed: ${error}`;
      onError(errorMessage);
      Alert.alert('Connection Error', errorMessage);
    }
  };

  const handleDisconnect = async () => {
    if (__DEV__) {
      console.log('User pressed disconnect button - disconnecting...');
    }
    try {
      await bleService.disconnect();
      if (__DEV__) {
        console.log('BLE service disconnect completed - waiting for callback...');
      }
      // Disconnection state will be updated via callback
    } catch (error) {
      const errorMessage = `Disconnect failed: ${error}`;
      onError(errorMessage);
      Alert.alert('Disconnect Error', errorMessage);
    }
  };

  const renderDevice = ({ item }: { item: TimeTrackerDevice }) => {
    const isConnecting = connectingDeviceId === item.id;
    // Verify connection state with BLE service to prevent showing stale connection data
    const connectedDevice = bleService.getConnectedDevice();
    const isThisDeviceConnected = connectedDevice && connectedDevice.id === item.id;
    
    // Additional check: if BLE service says connected but getConnectedDevice returns null, 
    // fall back to parent props for device matching
    const fallbackConnected = !connectedDevice && isConnected && connectedDeviceName === item.name;
    const finalIsConnected = isThisDeviceConnected || fallbackConnected;
    
    // Debug logging to help troubleshoot connection state issues
    if (__DEV__) {
      console.log(`Device ${item.name} (${item.id.substring(0,8)}...): connectedDevice=${connectedDevice?.name || 'null'} (${connectedDevice?.id.substring(0,8) || 'null'}...), isThisDeviceConnected=${isThisDeviceConnected}, fallbackConnected=${fallbackConnected}, finalIsConnected=${finalIsConnected}, isConnected(prop)=${isConnected}, connectedDeviceName(prop)=${connectedDeviceName}`);
    }
    
    
    return (
      <View style={[
        styles.deviceItem, 
        finalIsConnected && styles.deviceItemConnected
      ]}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceId}>MAC: {item.id}</Text>
          {item.rssi && (
            <Text style={styles.deviceRssi}>Signal: {item.rssi} dBm</Text>
          )}
          {finalIsConnected && (
            <Text style={styles.connectedStatus}>✓ Connected</Text>
          )}
        </View>
        
        <View style={styles.deviceActions}>
          {!connectedDevice ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.connectButton,
                isConnecting && styles.actionButtonDisabled
              ]}
              onPress={() => handleConnect(item)}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Connecting...</Text>
                </View>
              ) : (
                <Text style={styles.actionButtonText}>Connect</Text>
              )}
            </TouchableOpacity>
          ) : finalIsConnected ? (
            <View style={styles.connectedActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.configureButton]}
                onPress={onStartConfiguration}
              >
                <Text style={styles.actionButtonText}>Configure</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.disconnectButton]}
                onPress={handleDisconnect}
              >
                <Text style={styles.actionButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.deviceDisabled}>
              <Text style={styles.disabledText}>Device connected</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.title}>Time Tracker Redux</Text>
        {onShowHelp && (
          <TouchableOpacity style={styles.helpButton} onPress={onShowHelp}>
            <Text style={styles.helpButtonText}>Info</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Provider Setup Block */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Provider Setup</Text>
        {onSetupTimeTracking && (
          <TouchableOpacity
            style={[
              styles.setupButton, 
              hasProviderSetup && styles.setupButtonComplete
            ]}
            onPress={onSetupTimeTracking}
            disabled={isLoadingProviderStatus}
          >
            <Text style={styles.setupText}>
              {isLoadingProviderStatus ? 'Checking...' : 
               hasProviderSetup ? '✓ Tracking Provider Configured' : 'Set Up Tracking Provider'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Device Scanning Block */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Device Configuration</Text>
        {!hasProviderSetup && (
          <Text style={styles.sectionSubtitle}>
            Complete provider setup first to enable scanning
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.scanButton,
            isScanning && styles.scanButtonActive,
            (!hasProviderSetup || isLoadingProviderStatus) && styles.scanButtonDisabled
          ]}
          onPress={isScanning ? stopScan : startScan}
          disabled={isScanning || !hasProviderSetup || isLoadingProviderStatus}
        >
          {isScanning && <ActivityIndicator color="white" style={styles.spinner} />}
          <Text style={[
            styles.scanButtonText,
            (!hasProviderSetup || isLoadingProviderStatus) && styles.scanButtonTextDisabled
          ]}>
            {isScanning ? 'Scanning...' : 'Start Scan'}
          </Text>
        </TouchableOpacity>

       
        {devices.length > 0 && (
          <View style={styles.devicesContainer}>
            {devices.map((device, index) => (
              <View key={device.id} style={index === devices.length - 1 ? styles.lastDeviceItem : undefined}>
                {renderDevice({ item: device })}
              </View>
            ))}
          </View>
        )}

        {/* No devices message when scan completed but no devices found */}
        {!isScanning && devices.length === 0 && hasProviderSetup && (
          <Text style={styles.noDevicesText}>
            No configurable devices found. Make sure your TimeTracker is in setup mode and try scanning again.
          </Text>
        )}
      </View>
    </View>
  );


  return (
    <View style={styles.container}>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {renderHeader()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 10,
    paddingTop: 50,
    backgroundColor: '#FFFFFF'
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  helpButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  sectionBlock: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  setupButton: {
    backgroundColor: '#147500ff',
    padding: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  setupButtonComplete: {
    backgroundColor: '#4CAF50',
  },
  setupText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  scanButtonActive: {
    backgroundColor: '#ffb730ff',
  },
  scanButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButtonTextDisabled: {
    color: '#999999',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  scanningText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  devicesContainer: {
    marginTop: 16,
    marginBottom: 0,
  },
  devicesHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  lastDeviceItem: {
    marginBottom: 0,
  },
  noDevicesText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'left',
    marginTop: 16,
    lineHeight: 20,
  },
  spinner: {
    marginRight: 10,
  },
  deviceItem: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceItemConnected: {
    backgroundColor: '#d9e9faff',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceActions: {
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  deviceRssi: {
    fontSize: 12,
    color: '#888',
  },
  connectedStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    marginVertical: 6,
  },
  connectButton: {
    backgroundColor: '#2196F3',
  },
  configureButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  connectedActions: {
    flexDirection: 'column',
  },
  deviceDisabled: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  disabledText: {
    color: '#999999',
    fontSize: 12,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: {
       flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
