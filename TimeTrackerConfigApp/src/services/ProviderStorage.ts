import { ProviderStorage, ProviderConfiguration } from '../types/TimeTrackingProvider';
import { safeStorage } from '../utils/SafeStorage';

const STORAGE_KEY = '@timetracker_provider_config';

export class TimeTrackingProviderStorage implements ProviderStorage {
  
  async saveConfiguration(config: ProviderConfiguration): Promise<void> {
    try {
      const serialized = JSON.stringify(config);
      await safeStorage.setItem(STORAGE_KEY, serialized);
      console.log(`Saved ${config.providerId} provider configuration`);
    } catch (error) {
      console.error('Failed to save provider configuration:', error);
      throw new Error('Failed to save provider configuration');
    }
  }

  async loadConfiguration(): Promise<ProviderConfiguration | null> {
    try {
      const serialized = await safeStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return null;
      }
      
      const config = JSON.parse(serialized) as ProviderConfiguration;
      console.log(`Loaded ${config.providerId} provider configuration`);
      return config;
    } catch (error) {
      console.error('Failed to load provider configuration:', error);
      return null;
    }
  }

  async clearConfiguration(): Promise<void> {
    try {
      await safeStorage.removeItem(STORAGE_KEY);
      console.log('Cleared provider configuration');
    } catch (error) {
      console.error('Failed to clear provider configuration:', error);
      throw new Error('Failed to clear provider configuration');
    }
  }

  async hasConfiguration(): Promise<boolean> {
    try {
      const config = await this.loadConfiguration();
      return config !== null && this.isValidConfiguration(config);
    } catch (error) {
      return false;
    }
  }

  private isValidConfiguration(config: ProviderConfiguration): boolean {
    return !!(
      config &&
      config.providerId &&
      config.credentials &&
      config.workspaceId &&
      config.projectIds &&
      Object.keys(config.projectIds).length > 0
    );
  }

  // Additional utility methods for secure credential handling
  async saveSecureCredentials(providerId: string, credentials: Record<string, any>): Promise<void> {
    const key = `${STORAGE_KEY}_secure_${providerId}`;
    try {
      // In a production app, you might want to use a more secure storage solution
      // like react-native-keychain for sensitive data like API tokens
      const serialized = JSON.stringify(credentials);
      await safeStorage.setItem(key, serialized);
    } catch (error) {
      console.error('Failed to save secure credentials:', error);
      throw new Error('Failed to save secure credentials');
    }
  }

  async loadSecureCredentials(providerId: string): Promise<Record<string, any> | null> {
    const key = `${STORAGE_KEY}_secure_${providerId}`;
    try {
      const serialized = await safeStorage.getItem(key);
      if (!serialized) {
        return null;
      }
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Failed to load secure credentials:', error);
      return null;
    }
  }

  async clearSecureCredentials(providerId: string): Promise<void> {
    const key = `${STORAGE_KEY}_secure_${providerId}`;
    try {
      await safeStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear secure credentials:', error);
    }
  }

  // Migration helper for future provider changes
  async migrateConfiguration(fromVersion: string, toVersion: string): Promise<boolean> {
    try {
      const config = await this.loadConfiguration();
      if (!config) {
        return false;
      }

      // Implement version-specific migration logic here
      // For now, just return true as no migrations are needed
      console.log(`Migration from ${fromVersion} to ${toVersion} completed`);
      return true;
    } catch (error) {
      console.error('Configuration migration failed:', error);
      return false;
    }
  }

  // Export configuration for backup/sharing
  async exportConfiguration(): Promise<string | null> {
    try {
      const config = await this.loadConfiguration();
      if (!config) {
        return null;
      }

      // Remove sensitive credentials from export
      const exportConfig = {
        ...config,
        credentials: Object.keys(config.credentials).reduce((acc, key) => {
          // Mark secure fields as [REDACTED]
          acc[key] = key.toLowerCase().includes('token') || 
                     key.toLowerCase().includes('password') || 
                     key.toLowerCase().includes('secret') 
                     ? '[REDACTED]' 
                     : config.credentials[key];
          return acc;
        }, {} as Record<string, any>)
      };

      return JSON.stringify(exportConfig, null, 2);
    } catch (error) {
      console.error('Failed to export configuration:', error);
      return null;
    }
  }
}

// Singleton instance
export const providerStorage = new TimeTrackingProviderStorage();