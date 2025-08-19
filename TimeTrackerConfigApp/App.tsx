import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView, Alert } from 'react-native';
import { BLEScanner } from './src/components/BLEScanner';
import { TimeTrackerConfig } from './src/components/TimeTrackerConfig';
import { TimeTrackerDevice } from './src/types/TimeTrackerBLE';

type AppScreen = 'scanner' | 'config';

export default function App() {
  const [selectedDevice, setSelectedDevice] = useState<TimeTrackerDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string>('');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('scanner');

  const handleDeviceSelected = (device: TimeTrackerDevice) => {
    setSelectedDevice(device);
  };

  const handleConnected = (deviceName: string) => {
    setIsConnected(true);
    setConnectedDeviceName(deviceName);
  };

  const handleStartConfiguration = () => {
    setCurrentScreen('config');
  };

  const handleDisconnected = () => {
    setIsConnected(false);
    setConnectedDeviceName('');
    setCurrentScreen('scanner');
  };

  const handleError = (error: string) => {
    console.error('BLE Error:', error);
    Alert.alert('BLE Error', error);
  };

  const handleConfigurationSent = () => {
    Alert.alert(
      'Configuration Complete',
      'Your TimeTracker device has been configured successfully! You can now start using it.',
      [
        {
          text: 'Done',
          onPress: () => {
            setCurrentScreen('scanner');
            // Optionally disconnect after successful configuration
            // handleDisconnected();
          }
        }
      ]
    );
  };

  const handleBackToScanner = () => {
    setCurrentScreen('scanner');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {currentScreen === 'scanner' ? (
        <View style={styles.scannerContainer}>
          <BLEScanner 
            onDeviceSelected={handleDeviceSelected}
            onConnected={handleConnected}
            onDisconnected={handleDisconnected}
            onError={handleError}
            onStartConfiguration={handleStartConfiguration}
            selectedDevice={selectedDevice}
            connectedDeviceName={connectedDeviceName}
            isConnected={isConnected}
          />
        </View>
      ) : (
        <TimeTrackerConfig
          deviceName={connectedDeviceName}
          onConfigurationSent={handleConfigurationSent}
          onBack={handleBackToScanner}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scannerContainer: {
    flex: 1,
  },
});
