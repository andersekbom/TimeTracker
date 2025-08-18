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
}

export const BLEScanner: React.FC<BLEScannerProps> = ({ onDeviceSelected }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<TimeTrackerDevice[]>([]);
  const [bleService] = useState(() => new TimeTrackerBLEService());

  useEffect(() => {
    return () => {
      bleService.destroy();
    };
  }, [bleService]);

  const startScan = async () => {
    try {
      setIsScanning(true);
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

      // Stop scanning after 30 seconds
      setTimeout(() => {
        stopScan();
      }, 30000);

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

  const renderDevice = ({ item }: { item: TimeTrackerDevice }) => (
    <TouchableOpacity 
      style={styles.deviceItem} 
      onPress={() => handleDevicePress(item)}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceId}>ID: {item.id}</Text>
        {item.rssi && (
          <Text style={styles.deviceRssi}>Signal: {item.rssi} dBm</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TimeTracker Devices</Text>
      
      <TouchableOpacity
        style={[styles.scanButton, isScanning && styles.scanButtonActive]}
        onPress={isScanning ? stopScan : startScan}
        disabled={isScanning}
      >
        {isScanning && <ActivityIndicator color="white" style={styles.spinner} />}
        <Text style={styles.scanButtonText}>
          {isScanning ? 'Scanning...' : 'Start Scan'}
        </Text>
      </TouchableOpacity>

      {devices.length > 0 ? (
        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={item => item.id}
          style={styles.deviceList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {isScanning ? 'Looking for TimeTracker devices...' : 'No devices found. Make sure your TimeTracker is in setup mode.'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
  deviceList: {
    flex: 1,
  },
  deviceItem: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deviceInfo: {
    flex: 1,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});