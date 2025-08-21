// Simple in-memory storage that works without any native modules
class SimpleStorage {
  private storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    const value = this.storage.get(key) || null;
    console.log(`SimpleStorage: Getting ${key} -> ${value ? 'found' : 'null'}`);
    return value;
  }

  async setItem(key: string, value: string): Promise<void> {
    console.log(`SimpleStorage: Setting ${key}`);
    this.storage.set(key, value);
    return Promise.resolve();
  }

  async removeItem(key: string): Promise<void> {
    console.log(`SimpleStorage: Removing ${key}`);
    this.storage.delete(key);
    return Promise.resolve();
  }
}

// Export singleton instance - no AsyncStorage dependency
export const safeStorage = new SimpleStorage();