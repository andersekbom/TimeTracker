import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { providerRegistry } from '../services/ProviderRegistry';
import { providerStorage } from '../services/ProviderStorage';
import { ProviderConfiguration, TimeTrackingProvider } from '../types/TimeTrackingProvider';

interface TimeTrackingProviderListProps {
  onProviderSelect: (providerId: string) => void;
  onBack: () => void;
  refreshTrigger?: number; // Add this to trigger refresh when needed
}

interface ProviderStatus {
  provider: TimeTrackingProvider;
  isConfigured: boolean;
  isVerified: boolean;
}

export const TimeTrackingProviderList: React.FC<TimeTrackingProviderListProps> = ({
  onProviderSelect,
  onBack,
  refreshTrigger
}) => {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, [refreshTrigger]); // Refresh when trigger changes

  const loadProviders = async () => {
    try {
      const allProviders = providerRegistry.getAllProviders();
      const storedConfig = await providerStorage.loadConfiguration();
      
      const providerStatuses: ProviderStatus[] = allProviders.map(provider => ({
        provider,
        isConfigured: storedConfig?.providerId === provider.id,
        isVerified: storedConfig?.providerId === provider.id && Boolean(storedConfig),
      }));

      setProviders(providerStatuses);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  // This will be called when we return from the setup screen
  const refreshProviderStatus = () => {
    loadProviders();
  };

  const renderProvider = ({ item }: { item: ProviderStatus }) => (
    <TouchableOpacity
      style={styles.providerItem}
      onPress={() => onProviderSelect(item.provider.id)}
    >
      <View style={styles.providerInfo}>
        <Text style={styles.providerName}>{item.provider.name}</Text>
        <Text style={styles.providerDescription}>{item.provider.description}</Text>
      </View>
      
      <View style={styles.providerStatus}>
        {item.isVerified ? (
          <View style={styles.statusContainer}>
            <Text style={styles.checkmark}>✅</Text>
            <Text style={styles.configuredText}>Configured</Text>
          </View>
        ) : item.isConfigured ? (
          <View style={styles.statusContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.unverifiedText}>Not Verified</Text>
          </View>
        ) : (
          <View style={styles.statusContainer}>
            <Text style={styles.setupText}>Setup Required</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Time Tracking Providers</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading providers...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Time Tracking Providers</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Select a time tracking service to configure:
        </Text>
        
        <FlatList
          data={providers}
          renderItem={renderProvider}
          keyExtractor={item => item.provider.id}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50, // Adjusted for header height
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  providerItem: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  providerDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  providerStatus: {
    marginLeft: 16,
  },
  statusContainer: {
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 24,
    marginBottom: 4,
  },
  warningIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  configuredText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  unverifiedText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
  },
  setupText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
});