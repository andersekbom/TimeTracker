import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { TimeTrackerBLEService } from '../services/BLEService';
import { TimeTrackerDevice } from '../types/TimeTrackerBLE';

interface BLEConnectionManagerProps {
  selectedDevice: TimeTrackerDevice | null;
  onConnected: (deviceName: string) => void;
  onDisconnected: () => void;
  onError: (error: string) => void;
  onStartConfiguration: () => void;
  isConnected: boolean;
}

export const BLEConnectionManager: React.FC<BLEConnectionManagerProps> = ({
  selectedDevice,
  onConnected,
  onDisconnected,
  onError,
  onStartConfiguration,
  isConnected: propIsConnected
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string>('');
  const [bleService] = useState(() => TimeTrackerBLEService.getInstance());

  useEffect(() => {
    // Subscribe to connection state changes
    const handleConnectionStateChange = (connected: boolean, deviceName?: string) => {
      setIsConnected(connected);
      setIsConnecting(false);
      
      if (connected && deviceName) {
        setConnectedDeviceName(deviceName);
        onConnected(deviceName);
      } else {
        setConnectedDeviceName('');
        onDisconnected();
      }
    };

    bleService.onConnectionStateChange(handleConnectionStateChange);

    // Clean up the specific callback when unmounting
    return () => {
      bleService.removeConnectionStateCallback(handleConnectionStateChange);
    };
  }, [bleService, onConnected, onDisconnected]);

  const handleConnect = async () => {
    if (!selectedDevice) {
      onError('No device selected');
      return;
    }

    setIsConnecting(true);
    
    try {
      await bleService.connectToDevice(selectedDevice.id);
      // Connection state will be updated via callback
    } catch (error) {
      setIsConnecting(false);
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

  const getConnectionStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return `Connected to ${connectedDeviceName}`;
    if (selectedDevice) return `Ready to connect to ${selectedDevice.name}`;
    return 'No device selected';
  };

  const getConnectionStatusColor = () => {
    if (isConnecting) return '#FF9800'; // Orange
    if (isConnected) return '#4CAF50'; // Green
    if (selectedDevice) return '#2196F3'; // Blue
    return '#757575'; // Gray
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <View 
          style={[
            styles.statusIndicator, 
            { backgroundColor: getConnectionStatusColor() }
          ]} 
        />
        <Text style={styles.statusText}>
          {getConnectionStatusText()}
        </Text>
      </View>

      {selectedDevice && (
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{selectedDevice.name}</Text>
          <Text style={styles.deviceDetails}>
            ID: {selectedDevice.id.substring(0, 8)}...
            {selectedDevice.rssi && ` • Signal: ${selectedDevice.rssi} dBm`}
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {!isConnected ? (
          <TouchableOpacity
            style={[
              styles.button,
              styles.connectButton,
              (!selectedDevice || isConnecting) && styles.buttonDisabled
            ]}
            onPress={handleConnect}
            disabled={!selectedDevice || isConnecting}
          >
            {isConnecting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.buttonText}>Connecting...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Connect</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.connectedButtons}>
            <TouchableOpacity
              style={[styles.button, styles.configureButton]}
              onPress={onStartConfiguration}
            >
              <Text style={styles.buttonText}>Configure</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.disconnectButton]}
              onPress={handleDisconnect}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  deviceInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  deviceDetails: {
    fontSize: 14,
    color: '#666666',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
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
  connectedButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});