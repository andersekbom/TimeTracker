# TimeTracker Core Functionality Test

## Purpose

This test ensures that the core time tracking functionality (orientation detection and Toggl API communication) remains stable and functional during BLE system modifications. It serves as a regression test to verify that changes to the BLE configuration system don't break the primary device functionality.

## What This Test Validates

### 1. Hardware Components
- **IMU Initialization**: Verifies LSM6DSOX/LSM6DS3 sensor initializes correctly
- **IMU Data Reading**: Confirms acceleration data can be read reliably
- **LED Controller**: Tests LED color changes and status indication

### 2. Networking
- **WiFi Connectivity**: Ensures device can connect to WiFi network
- **WiFi Stability**: Verifies connection remains stable throughout testing
- **Network Status**: Checks IP assignment and signal strength

### 3. Orientation Detection
- **Detection Accuracy**: Tests orientation classification across multiple samples
- **Change Detection**: Verifies debouncing and orientation change events
- **Threshold Validation**: Ensures readings meet minimum quality standards (>70% valid)
- **LED Integration**: Confirms orientation changes trigger correct LED colors

### 4. Toggl API Integration
- **Authentication**: Verifies API token and workspace configuration
- **Timer Operations**: Tests start/stop time entry functionality
- **Error Handling**: Confirms graceful handling of API failures
- **Entry Management**: Validates time entry ID tracking

### 5. Integrated Workflow
- **End-to-End Flow**: Tests complete orientation → timer workflow
- **State Management**: Verifies proper timer state transitions
- **Error Recovery**: Tests system behavior during API failures

### 6. System Stability
- **Memory Usage**: Monitors for memory leaks during operation
- **Component Health**: Verifies all subsystems remain responsive
- **Long-Running Stability**: Tests system behavior over extended periods

## Test Structure

```cpp
setUp()                           // Initialize all components
test_imu_initialization()         // Verify IMU hardware
test_wifi_connectivity()          // Check network connection
test_orientation_detection()      // Test 10s of orientation sampling
test_toggl_api_basic_functionality() // API start/stop operations
test_integrated_workflow()        // 15s full workflow test
test_system_stability()           // Final health check
tearDown()                        // Clean shutdown
```

## Running the Test

### Option 1: Automated Script
```bash
./run_core_functionality_test.sh
```

### Option 2: Manual PlatformIO
```bash
# For Nano 33 IoT
pio run --target upload -e nano_33_iot_test
pio device monitor --baud 115200

# For Nano RP2040 Connect  
pio run --target upload -e nanorp2040connect_test
pio device monitor --baud 115200
```

## Test Configuration

The test uses hardcoded credentials to avoid BLE dependencies:
- **WiFi**: eichbaum / zooweedoobee
- **Toggl Token**: 8512ae2df80f50ecaa5a7e0c4c96cc57
- **Workspace**: 20181448
- **Project IDs**: Face orientations mapped to specific Toggl projects

## Expected Results

### Successful Test Output
```
=== FINAL TEST RESULTS ===
IMU Initialized: ✓
WiFi Connected: ✓
Toggl API Configured: ✓
Orientation Detection Working: ✓
Toggl Communication Working: ✓
Orientation Changes Detected: 3
Toggl API Calls Successful: 4
Toggl API Calls Failed: 0
========================

6 Tests 0 Failures 0 Ignored
```

### Test Interactions Required

1. **Orientation Detection Test (10s)**: 
   - Slowly rotate device through different orientations
   - Watch for orientation change messages in serial output
   - LED will change colors to indicate current orientation

2. **Integrated Workflow Test (15s)**:
   - Change device orientation multiple times
   - Observe timer start/stop messages
   - Each orientation change should trigger Toggl API calls

## Failure Diagnosis

### Common Issues and Solutions

| Failure | Likely Cause | Solution |
|---------|-------------|----------|
| `IMU initialization failed` | Hardware issue | Check IMU connections |
| `WiFi connection failed` | Network issue | Verify WiFi credentials |
| `Less than 70% valid readings` | IMU noise/calibration | Test in stable environment |
| `Toggl API calls failed` | Network/Auth issue | Check internet and API token |
| `System unstable` | Memory/resource issue | Check for memory leaks in changes |

### Debug Information

The test provides detailed logging:
- Acceleration values for each reading
- WiFi status and signal strength
- Toggl API response details
- Memory usage estimates
- Component health status

## Use During Development

### Before Making BLE Changes
1. Run test to establish baseline: `./run_core_functionality_test.sh`
2. Document current test results
3. Proceed with BLE modifications

### After BLE Changes
1. Run test again with same procedure
2. Compare results to baseline
3. Investigate any degradation in core functionality
4. Ensure all tests still pass before deploying

### Continuous Validation
- Run test after each major commit
- Include in CI/CD pipeline if available
- Use for acceptance testing before releases

## Test Environment Requirements

- Arduino device (Nano 33 IoT or Nano RP2040 Connect)
- WiFi network access (eichbaum network)  
- Valid Toggl API credentials
- PlatformIO development environment
- Serial monitor capability

This test ensures that core time tracking functionality remains rock-solid regardless of BLE system changes, providing confidence for iterative BLE development without risking the primary device purpose.