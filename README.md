# TimeTracker Cube - Wireless IoT Time Tracker

An intelligent physical time tracking device that automatically detects orientation changes and manages Toggl time entries wirelessly. Configure via mobile app, track time by simply rotating the cube.

## 🎯 Overview

TimeTracker is a cube-shaped IoT device that uses orientation sensors to automatically start and stop time tracking for different projects. Simply place the cube in different orientations to switch between work projects - the device handles Toggl API integration automatically.

**Key Features:**
- 🔷 **Wireless Configuration** - Set up via mobile app using Bluetooth Low Energy
- 📱 **Mobile App** - React Native app for device setup and management
- 🎲 **6-Orientation Tracking** - Each cube face represents a different project
- 🌐 **WiFi Connected** - Automatic sync with Toggl API
- 🔄 **Automatic Operation** - No manual interaction needed during use
- 💾 **Persistent Storage** - Configuration saved across power cycles
- 🎨 **Visual Feedback** - LED indicators for status and orientation

## 🚀 Quick Start

### Device Setup
1. Power on your TimeTracker device (it will enter BLE setup mode)
2. Install the TimeTracker Config mobile app
3. Connect to your device via the mobile app
4. Configure WiFi credentials and Toggl settings
5. Map each cube orientation to your work projects
6. Start tracking time by rotating the cube!

### Supported Hardware
- **Arduino Nano RP2040 Connect** (primary platform)
- **Arduino Nano 33 IoT** (secondary platform)

## 📱 Mobile App

The TimeTracker Configuration app provides:
- **Device Discovery** - Automatically finds nearby TimeTracker devices
- **WiFi Setup** - Secure credential configuration
- **Toggl Integration** - API token and workspace configuration
- **Project Mapping** - Assign projects to each cube orientation
- **QR Code Scanning** - Quick setup using QR codes
- **Status Monitoring** - Real-time setup progress

**Download:** Production APK available via EAS Build

## 🛠️ Development

### Arduino Firmware

```bash
# Build for Arduino Nano RP2040 Connect
pio run -e nanorp2040connect

# Build for Arduino Nano 33 IoT  
pio run -e nano_33_iot

# Upload to device
pio run --target upload -e nanorp2040connect

# Monitor serial output
pio device monitor
```

### Mobile App Development

```bash
cd TimeTrackerConfigApp

# Install dependencies
npm install

# Start development server
npx expo start

# Build production APK
eas build --platform android --profile production
```

## 🏗️ Architecture

### Hardware Components
- **IMU Sensor** - LSM6DSOX (RP2040) or LSM6DS3 (33 IoT) for orientation detection
- **WiFi Module** - WiFiNINA for internet connectivity  
- **BLE Module** - ArduinoBLE for wireless configuration
- **LED System** - RGB LED (RP2040) or status LED (33 IoT) for feedback

### Software Stack
- **Arduino Framework** - C++ firmware with modular architecture
- **React Native** - Cross-platform mobile app with TypeScript
- **Expo** - Mobile app development and distribution platform
- **PlatformIO** - Build system and library management

### Key Modules
- **OrientationDetector** - IMU-based cube orientation sensing
- **BLEConfigService** - Wireless device configuration
- **TogglAPI** - Time tracking API integration
- **NetworkManager** - WiFi connectivity management
- **LEDController** - Visual status feedback

## 📐 Orientation Mapping

Each cube orientation corresponds to a different work mode:

| Orientation | Default Use Case | LED Color (RP2040) | Blink Pattern (33 IoT) |
|-------------|-----------------|-------------------|----------------------|
| Face Up | Break Time | White | 1 blink |
| Face Down | Deep Work | Red | 2 blinks |
| Left Side | Meetings | Blue | 3 blinks |
| Right Side | Email/Admin | Yellow | 4 blinks |
| Front Edge | Creative Work | Purple | 5 blinks |
| Back Edge | Research | Cyan | 6 blinks |

## 🔧 Configuration Options

### Via Mobile App (Recommended)
- WiFi SSID and Password
- Toggl API Token
- Workspace ID
- Project IDs for each orientation
- Real-time validation and testing

### Manual Configuration (Development)
- Copy `src/Configuration.cpp.template` to `src/Configuration.cpp`
- Add your credentials directly in code
- Rebuild and upload firmware

## 🏷️ Version History

- **v1.0** (Current) - Full BLE configuration with mobile app
- **v0.9** (Tagged: Hardcoded-settings-v0.9) - Manual configuration version

## 📚 Documentation

- `CLAUDE.md` - Development setup and build commands
- `SETUP_CREDENTIALS.md` - Manual configuration guide
- `mvp-bt.md` - BLE feature specification
- `tasks-bt.md` - Development task history

## 🤝 Contributing

This project uses a modular, testable architecture following these principles:
- Write minimal, focused code
- Maintain clear separation of concerns  
- Preserve existing functionality
- Follow established patterns and conventions

## 📄 License

Open source project for IoT time tracking automation.