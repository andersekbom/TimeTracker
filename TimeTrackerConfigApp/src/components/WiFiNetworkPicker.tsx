import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';

interface WiFiNetwork {
  ssid: string;
  signal: number;
  security: string;
  id: string;
}

interface WiFiNetworkPickerProps {
  onNetworkSelected: (ssid: string) => void;
  onClose: () => void;
  currentSSID?: string;
}

export const WiFiNetworkPicker: React.FC<WiFiNetworkPickerProps> = ({
  onNetworkSelected,
  onClose,
  currentSSID,
}) => {
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Mock WiFi networks for demonstration
  // IMPORTANT: React Native doesn't have built-in WiFi scanning capabilities.
  // This component shows sample networks for UI demonstration purposes.
  // For production deployment, you would need to:
  // 1. Install a native module like react-native-wifi-manager (Android only)
  // 2. Create custom native modules for iOS WiFi scanning
  // 3. Or allow users to manually type network names
  const generateMockNetworks = (): WiFiNetwork[] => {
    const commonNetworkNames = [
      'WiFi', 'Home', 'WiFi-5G', 'MyRouter', 'NETGEAR', 'Linksys',
      'TP-LINK', 'ASUS', 'Vodafone', 'ATT', 'Xfinity', 'Verizon',
      'CoffeeShop_Free', 'Starbucks', 'McDonald_WiFi', 'Hotel_Guest',
      'AndroidAP', 'iPhone', 'Galaxy', 'OnePlus_Hotspot'
    ];
    
    const securities = ['WPA2', 'WPA3', 'Open', 'WPA2-Enterprise', 'WEP'];
    
    return Array.from({ length: Math.floor(Math.random() * 8) + 5 }, (_, index) => {
      const baseName = commonNetworkNames[Math.floor(Math.random() * commonNetworkNames.length)];
      const suffix = Math.random() > 0.7 ? `_${Math.floor(Math.random() * 99)}` : '';
      
      return {
        ssid: `${baseName}${suffix}`,
        signal: Math.floor(Math.random() * 50) - 80, // -30 to -80 dBm
        security: securities[Math.floor(Math.random() * securities.length)],
        id: `network_${index}_${Date.now()}_${Math.random()}` // Unique ID for each network
      };
    }).sort((a, b) => b.signal - a.signal);
  };

  const scanForNetworks = async () => {
    setIsScanning(true);
    
    // Simulate network scanning delay
    setTimeout(() => {
      // In a real implementation, replace this with actual WiFi scanning
      const mockNetworks = generateMockNetworks();
      const sortedNetworks = mockNetworks.sort((a, b) => b.signal - a.signal);
      setNetworks(sortedNetworks);
      setIsScanning(false);
    }, 2000);
  };

  useEffect(() => {
    scanForNetworks();
  }, []);

  const getSignalStrengthText = (signal: number): string => {
    if (signal >= -50) return 'Excellent';
    if (signal >= -60) return 'Good';
    if (signal >= -70) return 'Fair';
    return 'Weak';
  };

  const getSignalStrengthColor = (signal: number): string => {
    if (signal >= -50) return '#4CAF50'; // Green
    if (signal >= -60) return '#8BC34A'; // Light Green
    if (signal >= -70) return '#FFC107'; // Yellow
    return '#FF5722'; // Red
  };

  const getSecurityIcon = (security: string): string => {
    if (security === 'Open') return '🔓';
    return '🔒';
  };

  const renderNetwork = ({ item }: { item: WiFiNetwork }) => {
    const isCurrentNetwork = item.ssid === currentSSID;
    
    return (
      <TouchableOpacity
        style={[styles.networkItem, isCurrentNetwork && styles.currentNetworkItem]}
        onPress={() => onNetworkSelected(item.ssid)}
      >
        <View style={styles.networkInfo}>
          <View style={styles.networkHeader}>
            <Text style={styles.networkName}>
              {getSecurityIcon(item.security)} {item.ssid}
            </Text>
            {isCurrentNetwork && (
              <Text style={styles.currentLabel}>Current</Text>
            )}
          </View>
          
          <View style={styles.networkDetails}>
            <Text style={styles.networkSecurity}>{item.security}</Text>
            <Text 
              style={[
                styles.networkSignal,
                { color: getSignalStrengthColor(item.signal) }
              ]}
            >
              {getSignalStrengthText(item.signal)} ({item.signal} dBm)
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyState}>
      {isScanning ? (
        <>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.emptyText}>Generating sample networks...</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyText}>No sample networks available</Text>
          <TouchableOpacity style={styles.rescanButton} onPress={scanForNetworks}>
            <Text style={styles.rescanButtonText}>Generate Samples</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>WiFi Networks</Text>
      
      {/* Information Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          ℹ️ Note: This shows sample networks for demonstration. For actual WiFi scanning, 
          manually enter your network name in the SSID field or consider installing 
          native WiFi scanning modules.
        </Text>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={[styles.actionButton, isScanning && styles.actionButtonDisabled]} 
          onPress={scanForNetworks}
          disabled={isScanning}
        >
          <Text style={styles.actionButtonText}>
            {isScanning ? 'Generating...' : 'New Sample'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.closeButton]} onPress={onClose}>
          <Text style={[styles.actionButtonText, styles.closeButtonText]}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={networks}
        renderItem={renderNetwork}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        style={styles.list}
        contentContainerStyle={networks.length === 0 ? styles.listContentEmpty : styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  infoBanner: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderRadius: 6,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
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
  closeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  closeButtonText: {
    color: '#666666',
  },
  networkItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentNetworkItem: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#F1F8E9',
  },
  networkInfo: {
    flex: 1,
  },
  networkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  networkName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  networkDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  networkSecurity: {
    fontSize: 14,
    color: '#666666',
  },
  networkSignal: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  rescanButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rescanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});