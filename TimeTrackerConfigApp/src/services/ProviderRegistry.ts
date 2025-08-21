import { TimeTrackingProvider, ProviderRegistry } from '../types/TimeTrackingProvider';
import { TogglProvider } from '../providers/TogglProvider';
import { ClockifyProvider } from '../providers/ClockifyProvider';

class TimeTrackingProviderRegistry implements ProviderRegistry {
  private providers = new Map<string, TimeTrackingProvider>();

  constructor() {
    // Register default providers
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    this.register(new TogglProvider());
    this.register(new ClockifyProvider());
    // Future providers can be added here:
    // this.register(new RescueTimeProvider());
    // this.register(new TimeCampProvider());
  }

  register(provider: TimeTrackingProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(`Provider with ID '${provider.id}' is already registered. Overwriting.`);
    }
    this.providers.set(provider.id, provider);
    console.log(`Registered time tracking provider: ${provider.name} (${provider.id})`);
  }

  getProvider(id: string): TimeTrackingProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): TimeTrackingProvider[] {
    return Array.from(this.providers.values());
  }

  getAvailableProviders(): Array<{id: string; name: string; description: string}> {
    return this.getAllProviders().map(provider => ({
      id: provider.id,
      name: provider.name,
      description: provider.description
    }));
  }

  // Convenience method to get provider by name (case-insensitive)
  getProviderByName(name: string): TimeTrackingProvider | undefined {
    const normalizedName = name.toLowerCase();
    return this.getAllProviders().find(provider => 
      provider.name.toLowerCase() === normalizedName
    );
  }

  // Check if a provider is available
  hasProvider(id: string): boolean {
    return this.providers.has(id);
  }

  // Get provider count
  getProviderCount(): number {
    return this.providers.size;
  }

  // Remove a provider (useful for testing or dynamic unloading)
  unregister(id: string): boolean {
    const existed = this.providers.has(id);
    this.providers.delete(id);
    if (existed) {
      console.log(`Unregistered time tracking provider: ${id}`);
    }
    return existed;
  }
}

// Singleton instance
export const providerRegistry = new TimeTrackingProviderRegistry();

// Export the class for testing purposes
export { TimeTrackingProviderRegistry };