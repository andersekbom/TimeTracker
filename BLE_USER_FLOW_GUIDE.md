# BLE User Flow Testing Guide

## Quick Reference

This guide provides a step-by-step breakdown of the BLE testing flow based on `BLE-testing steps.md`.

## Test Execution

### Build and Run Tests
```bash
# Build user flow tests
/home/anders/.platformio/penv/bin/pio run -e nanorp2040connect_test

# Upload and run tests with serial monitoring
/home/anders/.platformio/penv/bin/pio test -e nanorp2040connect_test
/home/anders/.platformio/penv/bin/pio device monitor
```

## Expected Test Flow

### Test 1: Complete User Flow - Happy Path
**Validates Steps 1-4 from BLE-testing steps.md**

```
Step 1: Press "Start Scan"
✓ Device advertising and discoverable
✓ "Scanning..." displayed
✓ Device visible with "Connect" option

Step 2: Press "Connect"  
✓ Device connected via BLE
✓ Device shows "Configure" and "Disconnect" options

Step 3: Press "Disconnect"
✓ Device disconnected but remains discoverable
✓ Device shows "Connect" option when scanning

Step 4: Press "Connect" again
✓ Device reconnected via BLE
✓ Device shows "Configure" and "Disconnect" options
```

### Test 2: Configuration Flow
**Validates Steps 5-6 from BLE-testing steps.md**

```
Step 5: Press "Configure"
✓ Configuration screen displayed
✓ Device remains connected via BLE

Step 6: Press "Save Configuration"
✓ Configuration transmitted to device:
  - WiFi SSID: TestNetwork
  - WiFi Password: TestPassword123
  - Toggl Token: test_token_12345678901234567890
  - Workspace ID: 123456
  - Project IDs: 0,111,222,333,444,555
✓ Device list displayed
✓ Device still connected via BLE
✓ Device connects to WiFi (dual-mode active)
```

### Test 3: Reconfiguration Flow  
**Validates Steps 7-8 from BLE-testing steps.md**

```
Step 7: Press "Configure" again
✓ Configuration screen displayed
✓ Device remains connected via BLE
✓ WiFi connection maintained during BLE config

Step 8: Press "Save Configuration" again
✓ Updated configuration transmitted:
  - WiFi SSID: UpdatedNetwork
  - WiFi Password: UpdatedPassword123
  - Toggl Token: updated_token_98765432109876543210
  - Workspace ID: 654321
  - Project IDs: 0,999,888,777,666,555
✓ Device reconnects to new WiFi network
✓ BLE remains connected throughout process
```

### Test 4: Critical Requirement Validation
**Validates the core requirement: Always configurable via BLE**

```
Test 1: BLE configurable when WiFi disconnected
✓ BLE configuration accessible without WiFi

Test 2: BLE configurable when WiFi connected  
✓ BLE configuration accessible with WiFi active

Test 3: BLE survives WiFi reconnection
✓ BLE remains accessible during WiFi changes
```

### Test 5: BLE Stability During WiFi
**Validates dual-mode operation under load**

```
WiFi Operation Cycles (5 cycles):
✓ BLE polling maintained during WiFi activity
✓ BLE connection stable throughout all cycles
✓ No BLE disconnections during network operations
```

### Test 6: Error Recovery
**Validates fault tolerance and recovery**

```
Scenario 1: Brief connection interruption
✓ BLE recovers from temporary disconnection

Scenario 2: Service restart
✓ BLE service reinitializes successfully
✓ Connection restored after restart
```

## Success Criteria

### ✅ All Tests Must Pass
1. **Happy Path Flow**: All 4 basic steps work flawlessly
2. **Configuration**: Initial config transmission and WiFi connection
3. **Reconfiguration**: Live config updates with WiFi reconnection
4. **Always Configurable**: BLE works regardless of WiFi status
5. **Stability**: BLE remains connected during WiFi operations
6. **Recovery**: System recovers from errors gracefully

### ⚠️ Critical Failures
If any of these fail, BLE communication is broken:
- Device not discoverable (Step 1 failure)
- Cannot establish connection (Step 2 failure)
- Connection lost permanently (Steps 3-4 failure)
- Configuration not transmitted (Steps 5-6 failure)
- BLE lost during WiFi operations (Dual-mode failure)
- Cannot reconfigure (Steps 7-8 failure)

## Troubleshooting

### Common Issues and Solutions

| Issue | Test That Detects It | Solution |
|-------|---------------------|----------|
| Device not discoverable | Test 1: Start Scan | Check BLE initialization, advertising setup |
| Connection fails | Test 1: Connect | Verify BLE service configuration, characteristic setup |
| Disconnection issues | Test 1: Disconnect/Reconnect | Check connection state management |
| Config not sent | Test 2: Save Configuration | Validate characteristic writes, data format |
| WiFi interference | Test 5: BLE Stability | Review dual-mode implementation, polling frequency |
| Cannot reconfigure | Test 3: Reconfiguration | Check live update logic, state preservation |
| BLE lost during WiFi | Test 4: Always Configurable | Fix dual-mode state management |

### Debug Serial Output
The tests provide detailed logging for each step:
- ✓ Success indicators for each validation point
- ⚠️ Warning messages for timing issues  
- ✗ Error messages with specific failure details
- Step timing information (should complete within limits)

## Key Validation Points

### Timing Expectations
- **Scan/Discovery**: < 2 seconds
- **Connection**: < 3 seconds  
- **Disconnection**: < 1 second
- **Configuration Save**: < 5 seconds
- **Reconfiguration**: < 6 seconds (includes WiFi reconnection)

### State Persistence
- Device remains discoverable after disconnection
- BLE connection survives WiFi connection/disconnection
- Configuration state preserved during BLE operations
- Dual-mode operation maintains both connections

### Data Integrity
- All 12 BLE characteristics accessible
- Configuration data transmitted correctly
- Validation feedback provided via status characteristic
- Management commands processed properly

This user flow testing ensures the BLE implementation matches the exact expected behavior described in `BLE-testing steps.md`.