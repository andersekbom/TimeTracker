# TimeTracker Bluetooth Configuration MVP

## Overview
Enable wireless configuration of the TimeTracker cube via Bluetooth Low Energy (BLE) using a mobile app, eliminating the need to hardcode WiFi credentials and project IDs.

## MVP Scope

### Device Side (Arduino Nano 33 IoT)
- **BLE Server**: Advertise as "TimeTracker-XXXX" (last 4 digits of MAC)
- **Configuration Service**: Custom BLE service with characteristics for:
  - WiFi SSID/Password (write-only)
  - Toggl API token (write-only) 
  - Workspace ID (write-only)
  - Project IDs array (write-only, 6 integers)
  - Configuration status (read-only: "ready", "connecting", "connected", "error")
- **Persistent Storage**: Save configuration to EEPROM/Flash
- **Fallback Mode**: If no WiFi config exists, stay in BLE mode for setup

### Mobile App (Cross-platform)
- **BLE Scanner**: Discover and list TimeTracker devices
- **Simple Configuration UI**:
  - WiFi credentials input
  - Toggl API token input
  - Workspace ID input
  - 5 project ID inputs (Face Down, Left, Right, Front, Back)
- **One-tap Setup**: Send all config data and monitor connection status
- **Visual Feedback**: Show device connection progress

## User Flow
1. **Initial Setup**: Fresh device enters BLE config mode (LED indicates)
2. **Mobile Discovery**: App scans and finds "TimeTracker-XXXX"
3. **Connect & Configure**: User enters WiFi + Toggl details
4. **Deploy**: App sends config, device connects to WiFi and starts tracking
5. **Success**: Device LED confirms successful setup, BLE mode disabled

## Technical Implementation
- **Arduino Libraries**: ArduinoBLE, WiFiNINA, EEPROM
- **Mobile Framework**: Flutter/React Native for cross-platform support
- **BLE Protocol**: Custom GATT service with UTF-8 string characteristics
- **Security**: Local-only BLE communication, no cloud dependencies

## Success Criteria
- Device can be configured without code changes
- Setup process takes < 2 minutes
- Reliable WiFi connection after BLE configuration
- Configuration persists across power cycles
- Clear error handling for invalid credentials

## Future Enhancements
- Project name discovery from Toggl API
- Multiple WiFi network support
- OTA firmware updates via BLE
- Orientation calibration through app