import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView, Alert } from 'react-native';
import { BLEScanner } from './src/components/BLEScanner';
import { TimeTrackerConfig } from './src/components/TimeTrackerConfig';
import { SimpleTimeTrackingSetup } from './src/components/SimpleTimeTrackingSetup';
import { TimeTrackingProviderList } from './src/components/TimeTrackingProviderList';
import { TimeTrackerDevice } from './src/types/TimeTrackerBLE';

type AppScreen = 'scanner' | 'config' | 'providers' | 'setup';

export default function App() {
  const [selectedDevice, setSelectedDevice] = useState<TimeTrackerDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string>('');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('scanner');
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  const handleSetupTimeTracking = () => {
    setCurrentScreen('providers');
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProviderId(providerId);
    setCurrentScreen('setup');
  };

  const handleSetupComplete = () => {
    setRefreshTrigger(prev => prev + 1); // Trigger refresh of provider list
    setCurrentScreen('providers'); // Return to provider list to see checkmark
  };

  const handleBackToProviders = () => {
    setCurrentScreen('providers');
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
            onSetupTimeTracking={handleSetupTimeTracking}
            selectedDevice={selectedDevice}
            connectedDeviceName={connectedDeviceName}
            isConnected={isConnected}
          />
        </View>
      ) : currentScreen === 'providers' ? (
        <TimeTrackingProviderList
          onProviderSelect={handleProviderSelect}
          onBack={handleBackToScanner}
          refreshTrigger={refreshTrigger}
        />
      ) : currentScreen === 'setup' ? (
        <SimpleTimeTrackingSetup
          providerId={selectedProviderId || 'toggl'}
          onComplete={handleSetupComplete}
          onBack={handleBackToProviders}
        />
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
