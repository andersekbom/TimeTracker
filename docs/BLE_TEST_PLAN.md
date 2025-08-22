# BLE Connectivity Test Plan

## Overview

This document outlines a comprehensive test plan for troubleshooting BLE connectivity in the TimeTracker project. The tests are designed to verify the exact user flow described in `BLE-testing steps.md` and ensure reliable BLE communication at every step.

## Primary Test Focus: User Flow Validation

The main test suite (`test_ble_user_flow.cpp`) validates the exact 8-step user interaction flow:

### **Critical User Flow Steps**
1. **Start Scan** → Device discoverable with "Connect" option
2. **Connect** → Device connected, shows "Configure" and "Disconnect" options  
3. **Disconnect** → Device remains discoverable, shows "Connect" option
4. **Reconnect** → Device reconnected, shows "Configure" and "Disconnect" options
5. **Configure** → Configuration screen displays, BLE remains connected
6. **Save Configuration** → Config transmitted, WiFi connects, BLE maintained
7. **Reconfigure** → Configuration screen displays again, dual-mode operation
8. **Save Updated Config** → New config applied, WiFi reconnects, BLE maintained

### **Critical Requirement**
> **Device must ALWAYS be configurable via BLE regardless of WiFi connection status**

## Test Structure

The test framework consists of 6 test suites with the user flow tests as the primary validation:

### 1. **PRIMARY: User Flow Tests (`test_ble_user_flow.cpp`)**
- **Complete User Flow Happy Path**: Steps 1-4 (scan, connect, disconnect, reconnect)
- **Configuration Flow**: Steps 5-6 (configure mode, save config, WiFi connection)
- **Reconfiguration Flow**: Steps 7-8 (reconfigure, save updated config)
- **Always Configurable Validation**: Critical requirement testing
- **BLE Stability During WiFi**: Dual-mode operation validation
- **Error Recovery**: Resilience and fault tolerance

### 2. Basic Protocol Tests (`test_ble_protocol.cpp`)
- BLE service initialization
- Characteristic UUID validation  
- Management command processing
- Data format validation

### 3. Connectivity Tests (`test_ble_connectivity.cpp`)
Tests 1-12: Core connectivity functionality
- **Test 1**: BLE adapter initialization and availability
- **Test 2**: BLE service advertisement and discoverability  
- **Test 3**: BLE device scanning from mobile app perspective
- **Test 4**: Initial BLE connection establishment
- **Test 5**: BLE service and characteristic discovery
- **Test 6**: BLE characteristic read operations
- **Test 7**: BLE characteristic write operations
- **Test 8**: WiFi credential transmission via BLE
- **Test 9**: Toggl API credential transmission via BLE
- **Test 10**: Project ID array transmission via BLE
- **Test 11**: Configuration validation feedback via BLE
- **Test 12**: BLE disconnection handling

### 3. Advanced BLE Tests (`test_ble_advanced.cpp`)
Tests 13-20: Advanced scenarios and edge cases
- **Test 13**: BLE reconnection after disconnection
- **Test 14**: BLE connection during WiFi operation (dual-mode)
- **Test 15**: Live configuration updates via BLE
- **Test 16**: BLE management commands (backup/restore/reset)
- **Test 17**: BLE diagnostics data retrieval
- **Test 18**: BLE device info characteristic access
- **Test 19**: BLE connection stability under various conditions
- **Test 20**: BLE error recovery and retry mechanisms

### 4. Config Storage Tests (`test_config_storage.cpp`)
- Configuration storage and retrieval
- Data validation pipelines
- Backup and restore functionality

### 5. State Manager Tests (`test_state_manager.cpp`)
- System state transitions
- Dual-mode operation support
- Error handling and recovery

### 6. System Diagnostics Tests (`test_system_diagnostics.cpp`)
- Performance monitoring
- Health status reporting
- Network and BLE activity tracking

## BLE Characteristics Tested

The test framework validates all 12 BLE characteristics:

### Basic Configuration (6 characteristics)
1. **Service UUID**: `6ba7b810-9dad-11d1-80b4-00c04fd430c8`
2. **WiFi SSID**: `6ba7b811-9dad-11d1-80b4-00c04fd430c8`
3. **WiFi Password**: `6ba7b812-9dad-11d1-80b4-00c04fd430c8`
4. **Toggl Token**: `6ba7b813-9dad-11d1-80b4-00c04fd430c8`
5. **Workspace ID**: `6ba7b814-9dad-11d1-80b4-00c04fd430c8`
6. **Project IDs**: `6ba7b815-9dad-11d1-80b4-00c04fd430c8`
7. **Status**: `6ba7b816-9dad-11d1-80b4-00c04fd430c8`

### Enhanced Management (5 characteristics)
8. **Device Info**: `6ba7b817-9dad-11d1-80b4-00c04fd430c8`
9. **Diagnostics**: `6ba7b818-9dad-11d1-80b4-00c04fd430c8`
10. **Backup**: `6ba7b819-9dad-11d1-80b4-00c04fd430c8`
11. **Restore**: `6ba7b81a-9dad-11d1-80b4-00c04fd430c8`
12. **Command**: `6ba7b81b-9dad-11d1-80b4-00c04fd430c8`
13. **Current Config**: `6ba7b81c-9dad-11d1-80b4-00c04fd430c8`

## Test Scenarios

### Connection Lifecycle Testing
1. **Initial Setup**: Device powers on → BLE advertising starts → App discovers device
2. **Connection**: App connects → Service discovery → Characteristic enumeration
3. **Configuration**: App writes WiFi credentials → Toggl credentials → Project IDs
4. **Validation**: Device validates input → Updates status characteristic → App reads status
5. **Disconnection**: App disconnects → Device maintains advertising → Ready for reconnection

### Dual-Mode Operation Testing
1. **BLE Only**: Device in setup mode, BLE active, WiFi inactive
2. **Transition**: Configuration received, WiFi connecting, BLE maintained
3. **Dual Mode**: WiFi connected for API calls, BLE active for management
4. **Live Updates**: Configuration changes via BLE while WiFi operational

### Error Recovery Testing
1. **Connection Timeouts**: Simulated connection failures and recovery
2. **Service Interruption**: BLE service restart and characteristic restoration
3. **Data Corruption**: Invalid characteristic data handling and recovery
4. **Network Interference**: BLE operation during heavy WiFi activity

## Data Validation Testing

### WiFi Credentials
- **Valid SSID**: 1-32 characters, printable ASCII
- **Valid Password**: 8-63 characters for WPA/WPA2
- **Invalid Cases**: Empty fields, too short/long passwords, special characters

### Toggl API Credentials  
- **Valid Token**: 20+ character alphanumeric API token
- **Valid Workspace**: Numeric workspace ID > 0
- **Invalid Cases**: Short tokens, non-numeric workspace, empty fields

### Project IDs
- **Valid Array**: 6 project IDs, each 0 ≤ ID < 1,000,000,000
- **Special Cases**: 0 = timer stopped, negative values invalid
- **Format**: Comma-separated string transmission

## Running the Tests

### Build Commands
```bash
# Build test framework for RP2040 Connect
/home/anders/.platformio/penv/bin/pio run -e nanorp2040connect_test

# Build test framework for Nano 33 IoT  
/home/anders/.platformio/penv/bin/pio run -e nano_33_iot_test

# Upload and run tests
/home/anders/.platformio/penv/bin/pio test -e nanorp2040connect_test
```

### Expected Output
The test framework provides detailed logging:
- **Integration Tests**: Basic system functionality
- **Component Tests**: Individual module validation  
- **Connectivity Tests**: Step-by-step BLE communication
- **Advanced Tests**: Edge cases and error recovery
- **Performance Tests**: Stability and stress testing

## Test Validation Strategy

### Phase 1: Unit Testing
Each test validates specific functionality in isolation with mock data and simulated conditions.

### Phase 2: Integration Testing  
Tests verify component interaction and end-to-end workflows with real BLE operations.

### Phase 3: Stress Testing
Extended operation tests validate stability under various load conditions and error scenarios.

### Phase 4: Field Testing
Real-world testing with actual mobile app connections to validate complete communication pipeline.

## Troubleshooting Guide

### Common Issues and Tests
1. **Device Not Discoverable**: Run Tests 1-3
2. **Connection Fails**: Run Tests 4-5  
3. **Data Not Transmitted**: Run Tests 6-11
4. **Reconnection Problems**: Run Tests 12-13
5. **Dual-Mode Issues**: Run Test 14
6. **Management Commands Fail**: Run Tests 16-17
7. **Stability Problems**: Run Tests 19-20

### Debugging Steps
1. **Examine Serial Output**: Detailed test logging shows exact failure points
2. **Check Characteristic UUIDs**: Verify all 12 characteristics are properly defined
3. **Validate Data Formats**: Ensure transmitted data meets validation requirements  
4. **Monitor Connection State**: Track BLE connection lifecycle through tests
5. **Analyze Error Recovery**: Verify proper handling of failure scenarios

## Success Criteria

A successful test run should show:
- ✅ All basic connectivity tests pass (Tests 1-12)
- ✅ Advanced scenario tests pass (Tests 13-20) 
- ✅ All characteristics properly discovered and accessible
- ✅ Data validation working correctly for all credential types
- ✅ Dual-mode operation stable during network activity
- ✅ Error recovery mechanisms functioning properly
- ✅ Management commands processed correctly
- ✅ No memory leaks or stability issues during extended operation

This comprehensive test framework ensures reliable BLE communication and provides granular debugging capabilities for any connectivity issues.