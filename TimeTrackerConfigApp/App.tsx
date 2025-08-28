import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView, Alert } from 'react-native';
import { BLEScanner } from './src/components/BLEScanner';
import { TimeTrackerConfig } from './src/components/TimeTrackerConfig';
import { SimpleTimeTrackingSetup } from './src/components/SimpleTimeTrackingSetup';
import { TimeTrackingProviderList } from './src/components/TimeTrackingProviderList';
import { HelpScreen } from './src/components/HelpScreen';
import { TimeTrackerDevice } from './src/types/TimeTrackerBLE';

type AppScreen = 'scanner' | 'config' | 'providers' | 'setup' | 'help';

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
    console.log('App: Disconnection reported');
    
    // Always reset connection state when disconnection is reported
    setIsConnected(false);
    setConnectedDeviceName('');
    
    // Don't auto-navigate during config to prevent interruption
    if (currentScreen !== 'config') {
      setCurrentScreen('scanner');
    }
  };

  const handleError = (error: string) => {
    console.error('BLE Error:', error);
    Alert.alert('BLE Error', error);
  };

  const handleConfigurationSent = async () => {
    // Configuration is complete, device is transitioning to WiFi mode
    // Clear device list for fresh scanning experience
    console.log('Configuration complete - returning to scanner and clearing device list');
    
    // Force BLE disconnection to clear any stale connection state
    try {
      const { TimeTrackerBLEService } = await import('./src/services/BLEService');
      const bleService = TimeTrackerBLEService.getInstance();
      if (bleService.isConnected()) {
        await bleService.disconnect();
      }
    } catch (error) {
      console.log('Error during forced disconnect:', error);
    }
    
    // Reset all connection state immediately to prevent device from being re-added to list
    setIsConnected(false);
    setConnectedDeviceName('');
    setSelectedDevice(null);
    
    setCurrentScreen('scanner');
    setRefreshTrigger(prev => prev + 1); // Force BLEScanner to remount and clear devices
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

  const handleShowHelp = () => {
    setCurrentScreen('help');
  };

  const handleBackFromHelp = () => {
    setCurrentScreen('scanner');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {currentScreen === 'scanner' ? (
        <View style={styles.scannerContainer}>
          <BLEScanner 
            key={`${refreshTrigger}-${currentScreen}`} // Force remount when returning from configuration or setup
            onDeviceSelected={handleDeviceSelected}
            onConnected={handleConnected}
            onDisconnected={handleDisconnected}
            onError={handleError}
            onStartConfiguration={handleStartConfiguration}
            onSetupTimeTracking={handleSetupTimeTracking}
            onShowHelp={handleShowHelp}
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
      ) : currentScreen === 'help' ? (
        <HelpScreen
          onBack={handleBackFromHelp}
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
