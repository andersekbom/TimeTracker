# Extensible Time Tracking Provider Architecture

## Overview

The TimeTracker mobile app now supports multiple time tracking services through an extensible provider architecture. This allows users to choose from different time tracking providers (Toggl, Clockify, etc.) and easily add new providers in the future.

## Architecture Components

### 1. Provider Interface (`TimeTrackingProvider`)
- **Abstract base class** defining the contract for all time tracking providers
- **Configuration fields** - dynamic form field definitions
- **Validation methods** - credentials, workspace, and project validation
- **Data retrieval** - workspaces and projects fetching
- **Device configuration** - building and parsing device configs

### 2. Provider Registry (`ProviderRegistry`)
- **Singleton service** managing all available providers
- **Dynamic registration** - providers register themselves at startup
- **Provider lookup** - retrieve providers by ID or name
- **Extensibility** - easy to add new providers without code changes

### 3. Provider Storage (`ProviderStorage`)
- **Persistent configuration** - AsyncStorage-based configuration persistence
- **Secure credentials** - separate secure storage for sensitive data
- **Configuration migration** - version migration support
- **Export/backup** - configuration export with credential redaction

### 4. Validation Service (`ProviderValidationService`)
- **Comprehensive validation** - credentials, workspace, and project validation
- **Progress feedback** - real-time validation progress reporting
- **Timeout handling** - configurable validation timeouts
- **Error categorization** - specific error types for better UX

## Current Providers

### Toggl Provider (`TogglProvider`)
- **API Integration** - Toggl Track API v9
- **Configuration Fields**:
  - API Token (secure password field)
  - Workspace ID (numeric validation)
- **Features**:
  - Credential validation against Toggl API
  - Workspace validation and listing
  - Project validation and listing
  - Device configuration building

## User Flow

### 1. Setup Phase
1. User clicks **"Setup"** button in main BLE scanner screen
2. **TimeTrackingSetup** screen opens
3. User selects time tracking provider (currently Toggl)
4. User enters provider credentials (API token, workspace ID)
5. App validates credentials in real-time
6. User configures project assignments for each cube orientation
7. Configuration is saved to persistent storage

### 2. Device Configuration Phase
1. User connects to TimeTracker device via BLE
2. **TimeTrackerConfig** screen loads saved provider configuration
3. App shows provider status (✅ Setup Complete or ⚠️ Setup Required)
4. User configures WiFi settings
5. App uses provider configuration to build device configuration
6. Configuration is transmitted to device via BLE

## UI Components

### TimeTrackingSetup Screen
- **Provider selection** - dropdown with available providers
- **Dynamic form fields** - generated from provider configuration
- **Real-time validation** - credential verification with progress feedback
- **Workspace/project loading** - automatic data retrieval after validation
- **Project assignment** - mapping projects to cube orientations

### Enhanced BLE Scanner
- **Setup button** - access to time tracking configuration
- **Provider status indication** - shows if setup is complete

### Updated Config Screen
- **Provider status display** - shows configured provider and workspace
- **Setup warnings** - guides users to complete setup if missing
- **Automatic field population** - uses stored provider settings

## Adding New Providers

### Step 1: Implement Provider Class
```typescript
export class ClockifyProvider extends TimeTrackingProvider {
  readonly id = 'clockify';
  readonly name = 'Clockify';
  readonly description = 'Free time tracking software';

  getConfigurationFields(): ConfigurationField[] {
    return [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        secure: true
      },
      // ... other fields
    ];
  }

  async validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult> {
    // Implement Clockify API validation
  }

  // ... implement other required methods
}
```

### Step 2: Register Provider
```typescript
// In ProviderRegistry.ts
private registerDefaultProviders(): void {
  this.register(new TogglProvider());
  this.register(new ClockifyProvider()); // Add new provider
}
```

### Step 3: Test Integration
- Provider automatically appears in setup screen
- Validation and configuration work automatically
- Device configuration generation works seamlessly

## Benefits

### For Users
- **Single setup process** - configure once, use everywhere
- **Multiple provider support** - choose preferred time tracking service
- **Credential validation** - real-time verification prevents configuration errors
- **Visual feedback** - clear status indicators and progress reports

### For Developers
- **Extensible architecture** - easy to add new providers
- **Type safety** - full TypeScript support with interfaces
- **Modular design** - each provider is self-contained
- **Consistent UX** - all providers follow same interaction patterns

### For Future Development
- **Easy provider addition** - new services require minimal code changes
- **Configuration migration** - support for provider format changes
- **API evolution** - providers can evolve independently
- **Testing isolation** - each provider can be tested separately

## File Structure

```
src/
├── types/
│   └── TimeTrackingProvider.ts     # Core interfaces and types
├── providers/
│   └── TogglProvider.ts            # Toggl implementation
├── services/
│   ├── ProviderRegistry.ts         # Provider management
│   ├── ProviderStorage.ts          # Configuration persistence
│   └── ProviderValidationService.ts # Validation logic
└── components/
    ├── TimeTrackingSetup.tsx       # Setup screen
    ├── BLEScanner.tsx             # Enhanced scanner with setup
    └── TimeTrackerConfig.tsx       # Updated config screen
```

## Configuration Data Flow

1. **User Setup** → `ProviderConfiguration` → `ProviderStorage`
2. **Device Config** → `ProviderStorage` → `Provider.buildDeviceConfiguration()` → BLE transmission
3. **Device Reading** → BLE reception → `Provider.parseDeviceConfiguration()` → `ProviderConfiguration`

## Error Handling

- **Network errors** - timeout handling with user-friendly messages
- **API errors** - specific error codes mapped to actionable messages
- **Validation errors** - field-level validation with inline feedback
- **Storage errors** - graceful fallback with user notification

## Security Considerations

- **Credential storage** - separate secure storage for API tokens
- **Configuration export** - credentials are redacted in exports
- **Validation caching** - credentials are not cached after validation
- **Error messages** - sensitive information is not exposed in error logs

## Future Enhancements

### Planned Providers
- **Clockify** - Free alternative to Toggl
- **RescueTime** - Automatic time tracking
- **Harvest** - Business-focused time tracking
- **Custom API** - Generic REST API provider

### Advanced Features
- **Multi-workspace support** - multiple workspaces per provider
- **Conditional fields** - dynamic form fields based on provider
- **Bulk operations** - batch project assignments
- **Sync verification** - verify device configuration matches setup

This architecture provides a solid foundation for supporting multiple time tracking services while maintaining a consistent user experience and enabling easy extensibility for future providers.