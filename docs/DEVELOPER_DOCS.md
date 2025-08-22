# TimeTracker Developer Documentation

## Project Overview

TimeTracker is a wireless IoT cube that automatically tracks time using time tracking service APIs (Toggl Track, Clockify, etc.) by detecting physical orientation changes. The device switches between work projects based on which face is pointing up. Configuration is performed wirelessly via a mobile app using Bluetooth Low Energy.

## Architecture Overview

```
┌─────────────────┐    BLE Config    ┌──────────────────┐    WiFi/HTTPS    ┌─────────────────┐
│   Mobile App    │ ◄──────────────► │  Arduino Device  │ ◄──────────────► │ Time Tracking   │
│  (React Native) │                  │   (Nano 33 IoT)  │                  │    Services     │
└─────────────────┘                  └──────────────────┘                  │ (Toggl/Clockify)│
                                                                            └─────────────────┘
```

### Hardware
- **Primary**: Arduino Nano RP2040 Connect
- **Secondary**: Arduino Nano 33 IoT  
- **IMU**: LSM6DSOX/LSM6DS3 for orientation detection
- **Connectivity**: WiFiNINA + ArduinoBLE
- **Feedback**: RGB LED (RP2040) or blink patterns (33 IoT)

---

## Mobile App Architecture (React Native/Expo)

### Directory Structure
```
TimeTrackerConfigApp/
├── App.tsx                          # Main app component with navigation
├── src/
│   ├── components/                  # UI components
│   │   ├── BLEScanner.tsx          # Device discovery and connection
│   │   ├── TimeTrackerConfig.tsx   # Device configuration screen
│   │   ├── SimpleTimeTrackingSetup.tsx # Provider setup screen
│   │   └── TimeTrackingProviderList.tsx # Provider selection
│   ├── services/                   # Business logic services
│   │   ├── BLEService.ts           # BLE communication layer
│   │   ├── ProviderRegistry.ts     # Time tracking provider registry
│   │   └── ProviderStorage.ts      # Configuration persistence
│   ├── providers/                  # Time tracking service implementations
│   │   ├── TogglProvider.ts        # Toggl Track integration
│   │   └── ClockifyProvider.ts     # Clockify integration
│   ├── types/                      # TypeScript type definitions
│   │   ├── TimeTrackerBLE.ts       # BLE protocol types
│   │   └── TimeTrackingProvider.ts # Provider interface types
│   └── utils/                      # Utility functions
│       ├── configValidation.ts     # Configuration validation
│       ├── togglValidation.ts      # Toggl-specific validation
│       └── qrScanHandlers.ts       # QR code scanning logic
```

### Core Components

#### BLEService.ts - BLE Communication Layer
**Purpose**: Handles all Bluetooth Low Energy communication with Arduino devices.

**Key Features**:
- Singleton pattern prevents multiple BLE managers
- Device scanning with service UUID filtering
- Connection state management with callbacks
- Configuration transmission with timing delays
- Status monitoring for device feedback

**Critical Implementation Details**:
```typescript
// String transmission uses raw Base64 encoding
const ssidAsBase64 = this.stringToBase64(config.wifi.ssid);
await this.device.writeCharacteristicWithResponseForService(
  TIMETRACKER_SERVICE_UUID,
  BLE_CHARACTERISTICS.WIFI_SSID,
  ssidAsBase64
);

// 100ms delays between writes prevent connection instability
await new Promise(resolve => setTimeout(resolve, 100));
```

**Configuration Flow**:
1. Send WiFi SSID (Base64 encoded)
2. Send WiFi Password (Base64 encoded)  
3. Send Toggl Token (Base64 encoded)
4. Send Workspace ID (Base64 encoded)
5. Send Project IDs (6 integers as 24-byte array)
6. Wait for `config_success` status confirmation

#### Provider Architecture
**Purpose**: Extensible system supporting multiple time tracking services.

**Core Interface** (`TimeTrackingProvider`):
```typescript
interface TimeTrackingProvider {
  id: string;
  name: string;
  validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult>;
  getProjects(credentials: ProviderCredentials): Promise<Project[]>;
  getWorkspaces(credentials: ProviderCredentials): Promise<Workspace[]>;
  getConfigurationFields(): ConfigurationField[];
}
```

**Adding New Providers**:
1. Create provider class implementing `TimeTrackingProvider`
2. Register in `ProviderRegistry.ts`
3. Add QR scanning support in `qrScanHandlers.ts`
4. Test integration in provider list

### BLE Protocol Specification

#### Service UUID
- `6ba7b810-9dad-11d1-80b4-00c04fd430c8`

#### Characteristics
| Characteristic | UUID | Type | Purpose |
|---------------|------|------|---------|
| WIFI_SSID | `6ba7b811...` | Write | WiFi network name (Base64) |
| WIFI_PASSWORD | `6ba7b812...` | Write | WiFi password (Base64) |
| TOGGL_TOKEN | `6ba7b813...` | Write | API token (Base64) |
| WORKSPACE_ID | `6ba7b814...` | Write | Workspace/team ID (Base64) |
| PROJECT_IDS | `6ba7b815...` | Write | 6 project IDs (24 bytes) |
| STATUS | `6ba7b816...` | Read/Notify | Device status updates |

#### Status Values
- `setup_mode`: Device awaiting configuration
- `ssid_received`: WiFi SSID received
- `password_received`: WiFi password received  
- `token_received`: API token received
- `workspace_received`: Workspace ID received
- `projects_received`: Project IDs received
- `config_complete`: All data received
- `config_success`: Configuration applied successfully

### Known Issues & Troubleshooting

#### BLE Connection Issues
**Symptom**: App reports device disconnection after configuration
**Solution**: Implemented graceful configuration completion with status confirmation

**Root Cause**: React Native BLE library incorrectly detected disconnection during rapid characteristic writes
**Fix**: Added 100ms delays between BLE writes and status monitoring

#### String Encoding Issues  
**Symptom**: WiFi SSID appears corrupted on device (e.g., "eichbaum" → "z'!m��")
**Solution**: Use raw Base64 encoding, let react-native-ble-plx handle transmission

**Root Cause**: Double Base64 encoding - library auto-decodes, Arduino expects raw strings
**Fix**: Send `Buffer.from(string).toString('base64')` directly

---

## Arduino Architecture (C++/PlatformIO)

### Directory Structure
```
src/
├── main.cpp                    # Setup and main loop
├── StateManager.cpp/.h         # Operation mode coordination
├── SystemUtils.cpp/.h          # Hardware initialization utilities
├── SimpleBLEConfig.cpp         # BLE configuration service
├── ConfigStorage.cpp/.h        # Persistent configuration storage
├── LEDController.cpp/.h        # Visual feedback system
├── NetworkManager.cpp/.h       # WiFi connection management
├── OrientationDetector.cpp/.h  # IMU-based orientation sensing
└── TogglAPI.cpp/.h            # Time tracking API client

include/
├── Config.h                    # System constants and defaults
└── Configuration.h.template    # Manual config template (gitignored)
```

### Core Architecture

#### StateManager - Operation Mode Coordinator
**Purpose**: Orchestrates dual-mode operation (BLE + WiFi) and state transitions.

**Key Responsibilities**:
- BLE configuration mode management
- Normal time tracking operation
- Dual-mode coordination after configuration
- LED status updates

**Critical Flow**:
```cpp
void loop() {
    if (stateManager.isBLEActive()) {
        stateManager.handleBLEMode();           // Always handle BLE
        
        if (configStorage.hasValidConfiguration()) {
            stateManager.handleNormalOperation(); // Also run time tracking
        }
    }
}
```

#### SimpleBLEConfig - BLE Configuration Service
**Purpose**: Handles wireless configuration via BLE characteristics.

**Key Implementation Details**:
- **Configuration Completion**: Waits for ALL data before starting WiFi
- **Status Updates**: Sends progress notifications to mobile app
- **String Handling**: Expects raw Base64 strings (no decoding)

**Critical Configuration Logic**:
```cpp
void checkConfigComplete() {
    if (receivedSSID.length() > 0 && receivedPassword.length() > 0 && 
        receivedToken.length() > 0 && receivedWorkspace.length() > 0 && 
        projectIdsReceived) {
        configComplete = true;
        // Only NOW start WiFi connection
    }
}
```

#### OrientationDetector - IMU Sensor Interface
**Purpose**: Detects cube orientation changes with debouncing.

**Orientation Mapping**:
```cpp
enum Orientation {
    FACE_UP,    // Stops timer
    FACE_DOWN,  // Project 1 (red LED/1 blink)
    LEFT_SIDE,  // Project 2 (blue LED/2 blinks)
    RIGHT_SIDE, // Project 3 (yellow LED/3 blinks)
    FRONT_EDGE, // Project 4 (purple LED/4 blinks)
    BACK_EDGE,  // Project 5 (cyan LED/5 blinks)
    UNKNOWN     // Error state
};
```

**Debouncing**: 5-second delay prevents rapid orientation changes from triggering multiple timer switches.

#### TogglAPI - Time Tracking Client
**Purpose**: RESTful API client for time tracking services.

**Key Features**:
- HTTPS requests via WiFiSSLClient
- JSON parsing with ArduinoJson
- Automatic timer stop/start on orientation changes
- Project ID validation during configuration

### Platform-Specific Code

#### Hardware Abstraction
```cpp
#if defined(ARDUINO_ARCH_SAMD) || defined(ARDUINO_NANO33BLE)
  #include <WiFiNINA.h>
  #include <Arduino_LSM6DSOX.h>
#elif defined(ARDUINO_ARCH_ESP32)
  #include <WiFi.h>
  #include <LSM6DS3.h>
#endif
```

#### LED Feedback Systems
- **RP2040 Connect**: RGB LED with color coding
- **Nano 33 IoT**: Built-in LED with blink patterns

### Configuration Flow

#### Graceful Configuration Sequence
1. Device receives all BLE configuration data
2. `checkConfigComplete()` confirms all required fields
3. Device sends `config_success` status to mobile app
4. 2-second delay allows mobile app to process confirmation
5. WiFi connection starts (may cause natural BLE disconnection)
6. Configuration saved to persistent storage
7. Device enters dual-mode operation (WiFi + BLE advertising)

#### Error Handling
- **WiFi Connection Failed**: Return to BLE setup mode
- **API Validation Failed**: Send error status to mobile app
- **IMU Initialization Failed**: Continue with limited functionality
- **Missing Configuration**: Auto-enter BLE setup mode

### Build Configuration (platformio.ini)

#### Primary Platform (nanorp2040connect)
```ini
[env:nanorp2040connect]
platform = raspberrypi
board = nanorp2040connect
framework = arduino
lib_deps = 
    arduino-libraries/WiFiNINA@^1.8.14
    arduino-libraries/ArduinoHttpClient@^0.4.0
    bblanchon/ArduinoJson@^7.0.4
    arduino-libraries/Arduino_LSM6DSOX@^1.1.3
    arduino-libraries/ArduinoBLE@^1.3.6
```

#### Secondary Platform (nano_33_iot)
```ini
[env:nano_33_iot]
platform = atmelsam
board = nano_33_iot
framework = arduino
# Same lib_deps as above
```

---

## Mobile App ↔ Arduino Interaction

### Configuration Protocol

#### 1. Device Discovery Phase
```
Mobile App                     Arduino Device
    |                               |
    |─── BLE Scan for Service ────→|
    |←── Advertise "TimeTracker-XX" |
    |                               |
    |─── Connect Request ──────────→|
    |←── Connection Established ────|
```

#### 2. Configuration Transmission Phase
```
Mobile App                     Arduino Device
    |                               |
    |─── WiFi SSID (Base64) ───────→|
    |                               |├─ Store SSID
    |                               |├─ Send "ssid_received"
    |←── Status: ssid_received ─────|
    |                               |
    |─── WiFi Password (Base64) ────→|
    |                               |├─ Store Password  
    |                               |├─ Send "password_received"
    |←── Status: password_received ──|
    |                               |
    |─── Toggl Token (Base64) ──────→|
    |                               |├─ Store Token
    |                               |├─ Send "token_received"
    |←── Status: token_received ─────|
    |                               |
    |─── Workspace ID (Base64) ─────→|
    |                               |├─ Store Workspace
    |                               |├─ Send "workspace_received"
    |←── Status: workspace_received ──|
    |                               |
    |─── Project IDs (24 bytes) ────→|
    |                               |├─ Store Projects
    |                               |├─ Send "projects_received"
    |←── Status: projects_received ───|
    |                               |├─ Check if complete
    |                               |├─ All data received!
    |                               |├─ Send "config_success"
    |←── Status: config_success ─────|
    |                               |├─ Start WiFi connection
    |                               |├─ Save to storage
    |                               |└─ Enter dual-mode
```

#### 3. Post-Configuration Phase
```
Mobile App                     Arduino Device
    |                               |
    |─── Disconnect Gracefully ─────→|
    |                               |├─ WiFi connected
    |                               |├─ Toggl API validated
    |                               |├─ Resume BLE advertising
    |                               |└─ Ready for time tracking
    |                               |
    |─── Future Reconnection ───────→| (Always discoverable)
```

### Error Scenarios

#### WiFi Connection Failure
```
Arduino Device                 Mobile App
    |                               |
    |├─ WiFi connection fails        |
    |├─ Return to BLE setup mode     |
    |├─ Send error status            |
    |─── Status: error ────────────→|
    |                               |├─ Show error dialog
    |                               |└─ Allow retry
```

#### API Validation Failure  
```
Arduino Device                 Mobile App
    |                               |
    |├─ WiFi connected               |
    |├─ Toggl API test fails         |
    |├─ Send error status            |
    |─── Status: error ────────────→|
    |                               |├─ Show API error
    |                               |└─ Return to setup
```

### Data Format Specifications

#### String Transmission
- **Encoding**: UTF-8 → Base64
- **Transmission**: Raw Base64 string
- **Arduino Handling**: Use raw received string (no decoding)

#### Project IDs Array
- **Format**: 6 × 32-bit integers (little-endian)
- **Size**: 24 bytes total
- **Order**: [FACE_UP, FACE_DOWN, LEFT_SIDE, RIGHT_SIDE, FRONT_EDGE, BACK_EDGE]
- **FACE_UP**: Always 0 (Timer Stopped)

#### Status Notifications
- **Type**: String characteristics with notifications enabled
- **Frequency**: Immediate on state changes
- **Reliability**: Fire-and-forget (no ACK required)

---

## Development Workflow

### Arduino Development
```bash
# Build for RP2040 Connect (primary)
/home/anders/.platformio/penv/bin/pio run -e nanorp2040connect

# Build for Nano 33 IoT (secondary)
/home/anders/.platformio/penv/bin/pio run -e nano_33_iot

# Upload and monitor
/home/anders/.platformio/penv/bin/pio run --target upload -e nanorp2040connect
/home/anders/.platformio/penv/bin/pio device monitor

# Clean build artifacts
/home/anders/.platformio/penv/bin/pio run --target clean
```

### Mobile App Development
```bash
cd TimeTrackerConfigApp

# Development server
npm install
npx expo start --dev-client --lan

# Production build
eas build --platform android --profile production
```

### Testing Procedures

#### BLE Configuration Test
1. Flash fresh firmware to device
2. Device should show blue LED (setup mode)
3. Run mobile app, scan for "TimeTracker-XXXX"
4. Connect and configure with test credentials
5. Verify all status updates received
6. Confirm WiFi connection and API validation
7. Check device remains discoverable after configuration

#### Orientation Detection Test
1. Configure device with valid project IDs
2. Place cube in each orientation
3. Verify LED color/pattern matches orientation
4. Confirm 5-second debouncing works
5. Check Toggl API receives timer start/stop requests

### Common Debugging Techniques

#### BLE Communication Issues
1. Enable verbose logging in mobile app
2. Monitor Arduino serial output during configuration
3. Check Base64 encoding/decoding at each step
4. Verify characteristic write acknowledgments
5. Test with nRF Connect app for baseline

#### WiFi/API Issues
1. Check WiFi credentials in device serial output
2. Test API credentials independently via curl
3. Verify project IDs exist in workspace
4. Monitor HTTPS request/response cycles
5. Check certificate chain validity

---

## Future Enhancement Opportunities

### Mobile App
- **Multi-device support**: Configure multiple TimeTracker cubes
- **Advanced scheduling**: Time-based project switching
- **Analytics dashboard**: Usage statistics and insights  
- **Cloud sync**: Backup configurations across devices
- **Team management**: Share configurations within organizations

### Arduino Device
- **Deep sleep mode**: Battery operation with wake-on-motion
- **Wireless updates**: OTA firmware deployment
- **Multi-IMU support**: Enhanced orientation detection
- **Display integration**: E-ink status display
- **Sensor expansion**: Temperature, light, sound sensing

### Integration Features
- **Calendar sync**: Auto-switch projects based on calendar events
- **Geofencing**: Location-aware project switching
- **Voice control**: Alexa/Google Assistant integration
- **IFTTT/Zapier**: Workflow automation triggers
- **Slack/Teams**: Status updates and notifications

---

## Security Considerations

### BLE Security
- **Pairing**: No authentication required (device-specific risk assessment needed)
- **Data transmission**: Base64 encoding provides minimal obfuscation
- **Network credentials**: Stored in plaintext on device (SPIFFS encryption recommended)

### WiFi Security  
- **WPA2/WPA3**: Standard WiFi security protocols supported
- **Certificate validation**: HTTPS API requests verify server certificates
- **Token storage**: API tokens stored in plaintext (hardware encryption recommended)

### Recommended Security Enhancements
1. Implement BLE pairing/bonding for sensitive deployments
2. Add SPIFFS encryption for credential storage
3. Implement token refresh mechanisms
4. Add device attestation for firmware integrity
5. Consider HSM integration for enterprise deployments

---

*Last Updated: August 2025*
*Project Version: v1.0 (Extensible Provider Architecture)*