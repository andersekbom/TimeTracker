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
    console.log('App: Disconnection reported, waiting 1 second to verify...');
    
    // Don't immediately navigate away - wait to see if it's a false positive
    // during configuration transmission
    setTimeout(() => {
      if (currentScreen !== 'config') {
        // If we're not in config screen, handle disconnection normally
        setIsConnected(false);
        setConnectedDeviceName('');
        setCurrentScreen('scanner');
      } else {
        // If we're in config screen, only navigate away if still disconnected
        console.log('App: Delayed disconnection check - still on config screen');
        // For now, don't auto-navigate during config to prevent interruption
      }
    }, 1000);
  };

  const handleError = (error: string) => {
    console.error('BLE Error:', error);
    Alert.alert('BLE Error', error);
  };

  const handleConfigurationSent = () => {
    // Configuration is complete, device is transitioning to WiFi mode
    // The device will remain discoverable for future configurations
    console.log('Configuration complete - returning to scanner for future device discovery');
    setCurrentScreen('scanner');
    
    // Reset connection state as device may disconnect during WiFi transition
    // but don't force disconnection - let it happen naturally
    setTimeout(() => {
      setIsConnected(false);
      setConnectedDeviceName('');
    }, 3000); // Allow time for graceful transition
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
