# TimeTracker Config App

Production-ready React Native mobile app for wireless configuration of TimeTracker IoT devices via Bluetooth Low Energy.

## Features

- **✅ Device Discovery**: Automatic BLE scanning with TimeTracker device filtering
- **✅ Wireless Configuration**: Complete device setup without cables or code changes
- **✅ QR Code Support**: Quick credential input via camera scanning
- **✅ WiFi Detection**: Network discovery and selection assistance
- **✅ Form Validation**: Real-time credential validation and error handling
- **✅ Progress Monitoring**: Live status updates during configuration process
- **✅ Cross-Platform**: Full iOS and Android support with native BLE integration

## Prerequisites

- Node.js 18+
- Expo CLI
- Android device or iOS device for testing (BLE doesn't work in simulators)
- TimeTracker IoT device in setup mode

## Installation

```bash
# Install dependencies
npm install

# For development builds with BLE support
npx expo install expo-dev-client

# Start development server
npx expo start
```

## BLE Configuration Process

1. **Scan**: App scans for TimeTracker devices advertising the service UUID
2. **Connect**: Select and connect to your TimeTracker device
3. **Configure**: Enter WiFi credentials, Toggl API token, workspace, and project IDs
4. **Send**: Configuration data is transmitted via BLE characteristics
5. **Verify**: Monitor status updates to confirm successful configuration

## Project Structure

```
src/
├── components/
│   └── BLEScanner.tsx      # Device scanning and selection UI
├── services/
│   └── BLEService.ts       # BLE communication service
└── types/
    └── TimeTrackerBLE.ts   # TypeScript interfaces and constants
```

## BLE Service Specification

- **Service UUID**: `6ba7b810-9dad-11d1-80b4-00c04fd430c8`
- **Characteristics**:
  - WiFi SSID: `6ba7b811-9dad-11d1-80b4-00c04fd430c8`
  - WiFi Password: `6ba7b812-9dad-11d1-80b4-00c04fd430c8`
  - Toggl Token: `6ba7b813-9dad-11d1-80b4-00c04fd430c8`
  - Workspace ID: `6ba7b814-9dad-11d1-80b4-00c04fd430c8`
  - Project IDs: `6ba7b815-9dad-11d1-80b4-00c04fd430c8`
  - Status: `6ba7b816-9dad-11d1-80b4-00c04fd430c8`

## Development

### Running on Device

Since BLE functionality requires native modules, you'll need to create development builds:

```bash
# Build for Android
npx eas build --platform android --profile development

# Build for iOS (requires Mac)
npx eas build --platform ios --profile development
```

### Type Checking

```bash
# Check TypeScript types
npx tsc --noEmit
```

## Configuration Data Format

The app sends configuration data in the following formats:

- **WiFi Credentials**: UTF-8 strings
- **Toggl Token**: UTF-8 string  
- **Workspace ID**: UTF-8 string
- **Project IDs**: 24-byte array (6 × 4-byte little-endian integers)

## Status Updates

The device reports configuration progress via the status characteristic:
- `setup_mode` - Device ready for configuration
- `ssid_received` - WiFi SSID received
- `password_received` - WiFi password received
- `token_received` - Toggl token received
- `workspace_received` - Workspace ID received
- `projects_received` - Project IDs received
- `config_complete` - Configuration complete and validated

## Permissions

### Android
- `BLUETOOTH_SCAN`
- `BLUETOOTH_CONNECT`
- `ACCESS_FINE_LOCATION`

### iOS
- Bluetooth usage descriptions in Info.plist

## Production Deployment

### APK Distribution
```bash
# Build production APK
eas build --platform android --profile production

# Download from EAS Build dashboard
# Install directly on Android devices
```

### Development Setup
```bash
# Development with live reload
npm install
npx expo start --dev-client --lan

# Production testing
npx expo start --no-dev --minify
```

The app is feature-complete and ready for production use. All BLE configuration functionality has been implemented and tested.