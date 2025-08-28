import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface HelpScreenProps {
  onBack: () => void;
}

export const HelpScreen: React.FC<HelpScreenProps> = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Help & Instructions</Text>
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          <Text style={styles.sectionText}>
            Welcome to Time Tracker Redux! This app helps you configure your TimeTracker IoT device for automatic time tracking based on cube orientation.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Setup Process</Text>
          <Text style={styles.stepNumber}>1.</Text>
          <Text style={styles.stepTitle}>Set Up Time Tracking Provider</Text>
          <Text style={styles.stepText}>
            First, configure your time tracking service (Toggl Track). You'll need your API token and workspace information.
          </Text>
          
          <Text style={styles.stepNumber}>2.</Text>
          <Text style={styles.stepTitle}>Scan for Devices</Text>
          <Text style={styles.stepText}>
            Power on your TimeTracker device. It will enter setup mode (blue LED) and appear in the scan results.
          </Text>
          
          <Text style={styles.stepNumber}>3.</Text>
          <Text style={styles.stepTitle}>Connect & Configure</Text>
          <Text style={styles.stepText}>
            Connect to your device and configure WiFi credentials and project assignments for each cube orientation.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Orientations</Text>
          <View style={styles.orientationItem}>
            <Text style={styles.orientationName}>Face Up:</Text>
            <Text style={styles.orientationDescription}>Stops current timer</Text>
          </View>
          <View style={styles.orientationItem}>
            <Text style={styles.orientationName}>Face Down:</Text>
            <Text style={styles.orientationDescription}>Project 1 (Red LED/1 blink)</Text>
          </View>
          <View style={styles.orientationItem}>
            <Text style={styles.orientationName}>Left Side:</Text>
            <Text style={styles.orientationDescription}>Project 2 (Blue LED/2 blinks)</Text>
          </View>
          <View style={styles.orientationItem}>
            <Text style={styles.orientationName}>Right Side:</Text>
            <Text style={styles.orientationDescription}>Project 3 (Yellow LED/3 blinks)</Text>
          </View>
          <View style={styles.orientationItem}>
            <Text style={styles.orientationName}>Front Edge:</Text>
            <Text style={styles.orientationDescription}>Project 4 (Purple LED/4 blinks)</Text>
          </View>
          <View style={styles.orientationItem}>
            <Text style={styles.orientationName}>Back Edge:</Text>
            <Text style={styles.orientationDescription}>Project 5 (Cyan LED/5 blinks)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LED Status Indicators</Text>
          <View style={styles.orientationItem}>
            <Text style={styles.orientationName}>Blue LED:</Text>
            <Text style={styles.orientationDescription}>Setup mode - awaiting configuration</Text>
          </View>
          <View style={styles.orientationItem}>
            <Text style={styles.orientationName}>Color/Pattern:</Text>
            <Text style={styles.orientationDescription}>Normal operation - indicates active project</Text>
          </View>
          <View style={styles.orientationItem}>
            <Text style={styles.orientationName}>Red Flashing:</Text>
            <Text style={styles.orientationDescription}>Error state - connection or initialization issues</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Troubleshooting</Text>
          <Text style={styles.bulletPoint}>• Ensure your device is powered on and in setup mode</Text>
          <Text style={styles.bulletPoint}>• Check that Bluetooth is enabled on your phone</Text>
          <Text style={styles.bulletPoint}>• Make sure you're within range of the device (typically 10 meters)</Text>
          <Text style={styles.bulletPoint}>• If connection fails, try restarting the device</Text>
          <Text style={styles.bulletPoint}>• Verify your WiFi credentials and API tokens are correct</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Features</Text>
          <Text style={styles.bulletPoint}>• 5-second debounce prevents rapid orientation changes</Text>
          <Text style={styles.bulletPoint}>• Automatic fallback to setup mode if WiFi fails</Text>
          <Text style={styles.bulletPoint}>• Configuration persists across power cycles</Text>
          <Text style={styles.bulletPoint}>• Standalone operation from USB power bank</Text>
          <Text style={styles.bulletPoint}>• Visual feedback for all system states</Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
    textAlign: 'center',
    marginRight: 60, // Compensate for back button width
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 12,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 8,
    marginLeft: 16,
  },
  orientationItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  orientationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    width: 80,
    flexShrink: 0,
  },
  orientationDescription: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
    lineHeight: 20,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 8,
  },
});