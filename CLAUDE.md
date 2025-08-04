# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a PlatformIO-based Arduino project called "TimeTracker" - an IoT device that automatically tracks time using a Toggl API integration. The project is designed for Arduino Nano boards (specifically Nano RP2040 Connect and Nano 33 IoT) that act as a physical "cube timer" - different orientations of the device correspond to different work projects and automatically start/stop time tracking.

### Hardware Architecture

- **Target Boards**: Arduino Nano RP2040 Connect (primary) and Nano 33 IoT (secondary)
- **Sensors**: LSM6DSOX (RP2040) or LSM6DS3 (33 IoT) IMU for orientation detection
- **Connectivity**: WiFiNINA for network connectivity
- **Visual Feedback**: RGB LED (RP2040) with color-coded orientation states, or built-in LED (33 IoT) with blink pattern indicators

### Software Architecture

The application is organized into modular components:

1. **OrientationDetector** (`src/OrientationDetector.cpp`): IMU-based cube orientation detection with debouncing
2. **TogglAPI** (`src/TogglAPI.cpp`): Complete Toggl API integration for time tracking
3. **NetworkManager** (`src/NetworkManager.cpp`): WiFi connectivity and NTP time synchronization
4. **LEDController** (`src/LEDController.cpp`): Hardware-agnostic LED control with visual feedback
5. **Config** (`include/Config.h`): Centralized configuration constants
6. **Main Application** (`src/main.cpp`): Clean orchestration of all modules

## Common Development Commands

### Building and Uploading
```bash
# Build the project for Nano RP2040 Connect (default environment)
pio run -e nanorp2040connect

# Build for Nano 33 IoT
pio run -e nano_33_iot

# Upload to device (will auto-detect connected board)
pio run --target upload

# Build and upload in one command
pio run --target upload -e nanorp2040connect
```

### Testing
```bash
# Run all tests
pio test

# Run specific test
pio test -e nanorp2040connect
```

### Monitoring and Debugging
```bash
# Open serial monitor (115200 baud rate)
pio device monitor

# Monitor with specific baud rate
pio device monitor -b 115200

# List connected devices
pio device list
```

### Project Management
```bash
# Update project dependencies
pio pkg update

# Install new library dependency
pio pkg install "library-name"

# Clean build files
pio run --target clean
```

## Project Configuration

The project supports two hardware targets defined in `platformio.ini`:

- **nanorp2040connect**: Uses LSM6DSOX IMU and full RGB LED support
- **nano_33_iot**: Uses LSM6DS3 IMU with built-in LED only

Key libraries:
- WiFiNINA for network connectivity
- ArduinoHttpClient for Toggl API communication
- ArduinoJson for JSON parsing/serialization
- NTPClient for time synchronization
- Arduino_LSM6DSOX/LSM6DS3 for IMU functionality

## Configuration Requirements

Before building, you must:

1. **Create WiFi Credentials File**: 
   - Copy `include/WiFiCredentials.h.template` to `include/WiFiCredentials.h`
   - Update with your WiFi network credentials
   - Add your Toggl API token and workspace ID
   - Customize project names for each cube orientation
2. **Security Note**: The `WiFiCredentials.h` file is gitignored to prevent accidental credential commits

## Key Implementation Details

- **Orientation Detection**: Uses accelerometer thresholds (±0.75g) to determine cube face
- **Debouncing**: 5-second debounce timer prevents rapid orientation changes
- **LED Feedback**: 
  - **RP2040**: Each orientation has a unique color (Green=Up, Red=Down, Blue=Left, Yellow=Right, Purple=Front, Cyan=Back)
  - **33 IoT**: Each orientation has a unique blink pattern (1=Up, 2=Down, 3=Left, 4=Right, 5=Front, 6=Back)
- **Break Time Mode**: Back edge (6 blinks) stops time tracking without starting new entries
- **API Integration**: RESTful HTTP calls to Toggl API v9 for time entry management
- **Simple Timing**: Uses millis()-based timestamps for relative timing without NTP dependency
- **Error Handling**: Visual LED feedback for connection issues and initialization errors

## Development Notes

- The project includes WiFi credentials in a separate header file - ensure this is properly gitignored in production
- Serial output at 115200 baud provides extensive debugging information
- LED behavior differs between board types: RP2040 uses RGB colors, 33 IoT uses blink patterns
- The blink pattern system allows clear orientation identification even with a single-color LED
- The orientation mapping can be customized by modifying the `getOrientationDescription()` function

## Standalone Operation

The device is designed for standalone operation from a 5V USB power bank:

- **No Serial Dependency**: 3-second timeout for serial connection, continues without it
- **Graceful Degradation**: Retries failed initializations, continues with reduced functionality if needed
- **Network Resilience**: WiFi connection attempts are limited, operates in offline mode if needed
- **Power Bank Compatible**: Works with standard 5V USB power banks
- **Error Recovery**: Non-blocking error handling prevents infinite loops
- **Runtime Reliability**: Device continues operating even with component failures