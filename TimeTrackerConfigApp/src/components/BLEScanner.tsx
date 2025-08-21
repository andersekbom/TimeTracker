import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { TimeTrackerBLEService } from '../services/BLEService';
import { TimeTrackerDevice } from '../types/TimeTrackerBLE';

interface BLEScannerProps {
  onDeviceSelected?: (device: TimeTrackerDevice) => void;
  onConnected: (deviceName: string) => void;
  onDisconnected: () => void;
  onError: (error: string) => void;
  onStartConfiguration: () => void;
  onSetupTimeTracking?: () => void;
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
  selectedDevice, 
  connectedDeviceName, 
  isConnected 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<TimeTrackerDevice[]>([]);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [bleService] = useState(() => TimeTrackerBLEService.getInstance());

  useEffect(() => {
    // Subscribe to connection state changes
      const handleConnectionStateChange = (connected: boolean, deviceName?: string) => {
      setConnectingDeviceId(null);

      if (connected && deviceName) {
        onConnected(deviceName);
      } else {
        onDisconnected();
        // After a disconnect, restart scanning so the user can reconnect without tapping Scan
        startScan();
      }
    };

    bleService.onConnectionStateChange(handleConnectionStateChange);

    // If we already have a connected device, make sure it's in the list
    if (isConnected && connectedDeviceName && selectedDevice) {
      setDevices(prev => {
        // Check if the connected device is already in the list
        const exists = prev.find(d => d.name === connectedDeviceName);
        if (!exists) {
          // Add the connected device to the list
          return [selectedDevice, ...prev];
        }
        return prev;
      });
    }

    return () => {
      // Clean up the specific callback when unmounting
      bleService.removeConnectionStateCallback(handleConnectionStateChange);
      // Don't destroy the singleton service, just stop scanning
      bleService.stopScan();
    };
  }, [bleService, onConnected, onDisconnected, isConnected, connectedDeviceName, selectedDevice]);

  // Separate effect to handle initial load when coming back from config screen
  useEffect(() => {
    if (isConnected && connectedDeviceName && selectedDevice) {
      setDevices(prev => {
        // Check if the connected device is already in the list
        const exists = prev.find(d => d.name === connectedDeviceName);
        if (!exists) {
          // Add the connected device to the list
          return [selectedDevice];
        }
        return prev;
      });
    }
  }, [isConnected, connectedDeviceName, selectedDevice]);

  const startScan = async () => {
    try {
      setIsScanning(true);
      
      // Clear existing devices to show fresh scan results
      setDevices([]);
      
      await bleService.scanForDevices(
        (device) => {
          setDevices(prev => {
            // Avoid duplicates
            if (prev.find(d => d.id === device.id)) {
              return prev;
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

  const handleDevicePress = (device: TimeTrackerDevice) => {
    stopScan();
    onDeviceSelected?.(device);
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
    try {
      await bleService.disconnect();
      // Disconnection state will be updated via callback
    } catch (error) {
      const errorMessage = `Disconnect failed: ${error}`;
      onError(errorMessage);
      Alert.alert('Disconnect Error', errorMessage);
    }
  };

  const renderDevice = ({ item }: { item: TimeTrackerDevice }) => {
    const isConnecting = connectingDeviceId === item.id;
    const isThisDeviceConnected = isConnected && connectedDeviceName === item.name;
    
    
    return (
      <View style={[
        styles.deviceItem, 
        isThisDeviceConnected && styles.deviceItemConnected
      ]}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceId}>ID: {item.id.substring(0, 8)}...</Text>
          {item.rssi && (
            <Text style={styles.deviceRssi}>Signal: {item.rssi} dBm</Text>
          )}
          {isThisDeviceConnected && (
            <Text style={styles.connectedStatus}>✓ Connected</Text>
          )}
        </View>
        
        <View style={styles.deviceActions}>
          {!isConnected ? (
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
          ) : isThisDeviceConnected ? (
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
      <Text style={styles.title}>Time Tracker Redux</Text>
        <View style={styles.headerActions}>

        {onSetupTimeTracking && (
          <TouchableOpacity
            style={styles.setupButton}
            onPress={onSetupTimeTracking}
          >
            <Text style={styles.setupText}>Setup</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.headerActions}>

        <TouchableOpacity
          style={[
            styles.scanButton,
            isScanning && styles.scanButtonActive
          ]}
          onPress={isScanning ? stopScan : startScan}
          disabled={isScanning}
        >
          {isScanning && <ActivityIndicator color="white" style={styles.spinner} />}
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 'Start Scan'}
          </Text>
        </TouchableOpacity>


      </View>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          {isScanning ? 'Looking for TimeTracker devices...' : 'No devices found. Make sure your TimeTracker is in setup mode.'}
        </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        style={styles.list}
        contentContainerStyle={devices.length === 0 ? styles.listContentEmpty : styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333333',
  },
  headerActions: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  setupButton: {
    backgroundColor: '#147500ff',
    padding: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
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
    backgroundColor: '#FF3B30',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  spinner: {
    marginRight: 10,
  },
  deviceItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceItemConnected: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#F1F8E9',
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
