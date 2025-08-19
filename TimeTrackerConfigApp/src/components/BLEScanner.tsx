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
  disabled?: boolean;
}

export const BLEScanner: React.FC<BLEScannerProps> = ({ onDeviceSelected, disabled = false }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<TimeTrackerDevice[]>([]);
  const [bleService] = useState(() => TimeTrackerBLEService.getInstance());

  useEffect(() => {
    return () => {
      // Don't destroy the singleton service, just stop scanning
      bleService.stopScan();
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
      style={[styles.deviceItem, disabled && styles.deviceItemDisabled]} 
      onPress={() => handleDevicePress(item)}
      disabled={disabled}
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

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>TimeTracker Devices</Text>
      
      <TouchableOpacity
        style={[
          styles.scanButton, 
          isScanning && styles.scanButtonActive,
          disabled && styles.scanButtonDisabled
        ]}
        onPress={isScanning ? stopScan : startScan}
        disabled={isScanning || disabled}
      >
        {isScanning && <ActivityIndicator color="white" style={styles.spinner} />}
        <Text style={styles.scanButtonText}>
          {isScanning ? 'Scanning...' : 'Start Scan'}
        </Text>
      </TouchableOpacity>
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
  scanButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
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
  },
  deviceItemDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.6,
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
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});