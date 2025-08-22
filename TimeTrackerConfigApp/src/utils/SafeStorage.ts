import AsyncStorage from '@react-native-async-storage/async-storage';

// Persistent storage using AsyncStorage for React Native
class PersistentStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      console.log(`PersistentStorage: Getting ${key} -> ${value ? 'found' : 'null'}`);
      return value;
    } catch (error) {
      console.error(`PersistentStorage: Error getting ${key}:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      console.log(`PersistentStorage: Setting ${key}`);
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`PersistentStorage: Error setting ${key}:`, error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      console.log(`PersistentStorage: Removing ${key}`);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`PersistentStorage: Error removing ${key}:`, error);
      throw error;
    }
  }
}

// Export singleton instance using AsyncStorage for persistence
export const safeStorage = new PersistentStorage();