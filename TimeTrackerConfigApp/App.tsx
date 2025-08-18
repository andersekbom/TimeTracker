import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView, Alert } from 'react-native';
import { BLEScanner } from './src/components/BLEScanner';
import { TimeTrackerDevice } from './src/types/TimeTrackerBLE';

export default function App() {
  const [selectedDevice, setSelectedDevice] = useState<TimeTrackerDevice | null>(null);

  const handleDeviceSelected = (device: TimeTrackerDevice) => {
    setSelectedDevice(device);
    Alert.alert(
      'Device Selected',
      `Selected: ${device.name}\nID: ${device.id}`,
      [
        {
          text: 'OK',
          onPress: () => {
            // TODO: Navigate to configuration screen
            console.log('TODO: Navigate to configuration for:', device);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <BLEScanner onDeviceSelected={handleDeviceSelected} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
