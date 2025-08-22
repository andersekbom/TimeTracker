# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TimeTracker is a wireless IoT cube that automatically tracks time using Toggl API integration. The device detects physical orientation changes and switches between work projects accordingly. Configuration is performed wirelessly via a mobile app using Bluetooth Low Energy.

### Hardware
- **Arduino Nano RP2040 Connect** (primary) or **Nano 33 IoT** (secondary)
- **IMU**: LSM6DSOX/LSM6DS3 for orientation detection
- **Connectivity**: WiFiNINA + ArduinoBLE
- **Feedback**: RGB LED (RP2040) or blink patterns (33 IoT)

### Software Architecture
- **StateManager**: BLE setup mode and normal operation coordination
- **SystemUtils**: Hardware initialization and system configuration
- **OrientationDetector**: IMU-based orientation sensing with debouncing
- **TogglAPI**: RESTful API integration with runtime configuration
- **BLEConfigService**: Wireless device setup via mobile app
- **LEDController**: Visual status feedback system
- **Config**: Centralized constants and configuration

## Development Commands

### Arduino Firmware
```bash
# Build for RP2040 Connect (primary platform)
/home/anders/.platformio/penv/bin/pio run -e nanorp2040connect

# Build for Nano 33 IoT
/home/anders/.platformio/penv/bin/pio run -e nano_33_iot

# Upload and monitor
/home/anders/.platformio/penv/bin/pio run --target upload -e nanorp2040connect
/home/anders/.platformio/penv/bin/pio device monitor

# Clean build artifacts
/home/anders/.platformio/penv/bin/pio run --target clean
```

### Mobile App (React Native/Expo)
```bash
cd TimeTrackerConfigApp

# Development
npm install
npx expo start --dev-client --lan

# Production build
eas build --platform android --profile production
```

## Configuration

### Device Setup (BLE Wireless - Recommended)
1. Fresh device automatically enters BLE setup mode (blue LED)
2. Use TimeTracker Config mobile app to connect and configure:
   - WiFi credentials
   - Toggl API token and workspace ID
   - Project IDs for each cube orientation
3. Configuration persists across power cycles

### Manual Setup (Development Only)
Copy `src/Configuration.cpp.template` to `src/Configuration.cpp` and add credentials directly. This file is gitignored for security.

## System Behavior

### Orientation Mapping
- **Face Up**: Stops current timer
- **Face Down**: Project 1 (red LED/1 blink)
- **Left Side**: Project 2 (blue LED/2 blinks)
- **Right Side**: Project 3 (yellow LED/3 blinks)
- **Front Edge**: Project 4 (purple LED/4 blinks)
- **Back Edge**: Project 5 (cyan LED/5 blinks)

### Operation Modes
- **BLE Setup Mode**: Blue LED - device awaiting configuration
- **Normal Operation**: Color/pattern indicates current project
- **Error State**: Red flashing - connection or initialization issues

### Key Features
- **5-second debounce** prevents rapid orientation changes
- **Automatic fallback** to BLE setup if WiFi fails
- **Persistent storage** maintains configuration across power cycles
- **Standalone operation** from USB power bank (no serial dependency)
- **Visual feedback** for all system states