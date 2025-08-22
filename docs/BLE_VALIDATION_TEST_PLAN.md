# BLE Configuration Validation Test Plan

## Test Environment Setup
- **Device**: Arduino Nano 33 IoT with latest firmware
- **Mobile App**: TimeTracker Config App (development build)
- **Required**: WiFi network credentials, valid Toggl API token

## Critical Fixes Implemented
1. ✅ **Base64 Decoding**: Mobile app sends base64, Arduino now properly decodes
2. ✅ **Token Length Fix**: ConfigStorage buffer increased from 128 to 256 chars
3. ✅ **BLE Reconnection**: Device name preserved, auto-refresh removed
4. ✅ **Dual-Mode Operation**: BLE + WiFi run simultaneously

---

## Phase 1: BLE Communication Validation

### Test 1.1: Device Discovery & Connection
**Expected Results:**
- Device appears as "TimeTracker-xxxx" in scan list
- Connection succeeds immediately
- Reconnection works without manual re-scanning

**Pass Criteria:**
- [ ] Device discovered within 10 seconds
- [ ] Initial connection successful  
- [ ] Disconnect/reconnect cycle works
- [ ] No "null" device names in logs

### Test 1.2: Data Encoding Verification
**Test Data:**
- WiFi SSID: "Test-Network_2.4GHz"
- WiFi Password: "ComplexPass!@#123"
- Toggl Token: "8512ae2df80f50ecaa5a7e0c4c96cc57" (32 chars)
- Workspace ID: "123456"

**Pass Criteria:**
- [ ] Arduino serial shows correct decoded SSID (not base64)
- [ ] Arduino serial shows correct decoded token length (32 chars)
- [ ] No truncation warnings in ConfigStorage logs
- [ ] All characteristics received successfully

---

## Phase 2: Configuration Workflow Validation

### Test 2.1: Complete Configuration Send
**Steps:**
1. Connect to device
2. Fill all configuration fields with test data
3. Submit configuration
4. Monitor both app and Arduino logs

**Pass Criteria:**
- [ ] All BLE writes complete without error
- [ ] Arduino receives all data with correct lengths
- [ ] Device transitions from setup to operational mode
- [ ] Configuration persists after power cycle

### Test 2.2: WiFi Connection Test
**Steps:**
1. Send valid WiFi credentials via BLE
2. Device should connect to WiFi automatically
3. Monitor serial output for connection status

**Pass Criteria:**
- [ ] WiFi connection established within 30 seconds
- [ ] IP address obtained and displayed
- [ ] Connection remains stable

---

## Phase 3: Dual-Mode Operation Test

### Test 3.1: Always-Configurable Verification
**Steps:**
1. Complete initial configuration (device connects to WiFi)
2. Verify device remains discoverable via BLE
3. Attempt reconfiguration while WiFi is active

**Pass Criteria:**
- [ ] Device remains in BLE scan list after WiFi connection
- [ ] Can reconnect for reconfiguration anytime
- [ ] Both BLE and WiFi operate simultaneously
- [ ] No interference between modes

### Test 3.2: Configuration Update Test
**Steps:**
1. Configure device with initial settings
2. Later, connect again and update Toggl workspace ID
3. Verify new settings are applied

**Pass Criteria:**
- [ ] Can reconnect and modify configuration
- [ ] New settings applied without full reset
- [ ] Previous WiFi connection maintained

---

## Phase 4: Time Tracking Integration

### Test 4.1: Toggl API Authentication
**Steps:**
1. Configure with valid Toggl credentials
2. Place device in Face Down position (Project 1)
3. Monitor serial output for API calls

**Pass Criteria:**
- [ ] Toggl API authentication successful
- [ ] Time entry created in correct workspace
- [ ] No authentication errors in logs

### Test 4.2: Orientation Detection
**Test Each Orientation:**
- **Face Up**: Stops timer
- **Face Down**: Project 1 (configurable ID)
- **Left Side**: Project 2
- **Right Side**: Project 3  
- **Front Edge**: Project 4
- **Back Edge**: Project 5

**Pass Criteria:**
- [ ] Each orientation detected within 2 seconds
- [ ] Correct LED feedback (color/blinks) shown
- [ ] Toggl API calls made with correct project IDs
- [ ] 5-second debounce prevents rapid switching

---

## Phase 5: End-to-End Validation

### Test 5.1: Complete Workflow
**Steps:**
1. Factory fresh device (no configuration)
2. Configure via BLE with real credentials
3. Test all 6 orientations
4. Verify time entries in Toggl web interface
5. Reconfigure one project ID
6. Test updated configuration

**Pass Criteria:**
- [ ] Complete workflow works without intervention
- [ ] All time entries appear correctly in Toggl
- [ ] Project assignments match orientations
- [ ] Start/stop behavior correct
- [ ] Reconfiguration updates work

### Test 5.2: Reliability Test
**Steps:**
1. Leave device running for 1 hour
2. Change orientations every 5 minutes
3. Monitor for any failures or crashes

**Pass Criteria:**
- [ ] No device crashes or resets
- [ ] All orientation changes detected
- [ ] WiFi connection remains stable
- [ ] BLE remains available for reconfiguration

---

## Common Issues & Troubleshooting

### WiFi Connection Fails
- Verify SSID/password encoding (should NOT be base64 in serial logs)
- Check network supports device type
- Ensure password special characters handled correctly

### Toggl Authentication Fails  
- Verify token is exactly 32 characters
- Check workspace ID is numeric
- Confirm token has appropriate permissions

### BLE Connection Issues
- Clear device from mobile app's Bluetooth cache
- Restart mobile app completely
- Power cycle Arduino device

### Orientation Not Detected
- Place device on flat surface
- Ensure 5-second debounce period between changes
- Check serial output for acceleration values

---

## Success Criteria Summary

**BLE Communication**: ✅ All encoding/decoding correct  
**Configuration**: ✅ All data transmitted and applied  
**Dual-Mode**: ✅ BLE + WiFi operate simultaneously  
**Time Tracking**: ✅ All orientations trigger correct API calls  
**Reliability**: ✅ Stable operation for extended periods