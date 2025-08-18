# Phase 2 BLE Configuration Testing Checklist

## Test 1: Fresh Device Boot (No Configuration)
**Goal**: Verify device enters BLE setup mode when no config exists

### Steps:
1. **Flash firmware** to clean device (no previous config)
2. **Power on** device
3. **Connect serial monitor** at 115200 baud

### Expected Serial Output:
```
TimeTracker Cube Starting...
Using RGB LED on Nano RP2040 Connect  (or "built-in LED on Nano 33 IoT")
Initializing memory-based configuration storage
BLE MAC Address: XX:XX:XX:XX:XX:XX
Generated Device Name: TimeTracker-XXXX
BLE Configuration Service started
Device name: TimeTracker-XXXX
State transition: setup_mode -> setup_mode
Status updated: setup_mode
TimeTracker Cube Ready!
```

### Expected LED Behavior:
- **RP2040 Connect**: Blue color (dim)
- **Nano 33 IoT**: Slow pulsing (2-second cycle)

### Expected BLE Behavior:
- Device should be **discoverable** as "TimeTracker-XXXX" (where XXXX = last 4 MAC digits)
- Should advertise configuration service UUID: `6ba7b810-9dad-11d1-80b4-00c04fd430c8`

**✅ PASS CRITERIA**: 
- [ ] Serial shows BLE setup mode entry
- [ ] LED shows setup mode pattern  
- [ ] Device appears in BLE scanner
- [ ] Device name matches "TimeTracker-XXXX" format

---

## Test 2: BLE Service Discovery
**Goal**: Verify all BLE characteristics are accessible

### Steps:
1. **Open nRF Connect** app on mobile device
2. **Scan for devices**, find "TimeTracker-XXXX" 
3. **Connect** to device
4. **Discover services**

### Expected nRF Connect Display:
```
Generic Access (0x1800)
Generic Attribute (0x1801)

TimeTracker Configuration (6ba7b810-9dad-11d1-80b4-00c04fd430c8)
├── WiFi SSID (6ba7b811-...) [WRITE]
├── WiFi Password (6ba7b812-...) [WRITE]  
├── Toggl Token (6ba7b813-...) [WRITE]
├── Workspace ID (6ba7b814-...) [WRITE]
├── Project IDs (6ba7b815-...) [WRITE]
└── Status (6ba7b816-...) [READ, notify]
```

### Expected Serial Output on Connection:
```
[BLE connection events - device specific]
```

**✅ PASS CRITERIA**:
- [ ] All 6 characteristics visible in nRF Connect
- [ ] Characteristic properties match expected (Write/Read/Notify)
- [ ] Status characteristic shows "setup_mode"

---

## Test 3: Configuration Data Transmission
**Goal**: Verify device receives and processes BLE configuration data

### Steps:
1. **Connected to device** via nRF Connect
2. **Write WiFi SSID**: 
   - Select WiFi SSID characteristic (6ba7b811-...)
   - Write your WiFi network name as UTF-8 text
3. **Write WiFi Password**:
   - Select WiFi Password characteristic (6ba7b812-...)  
   - Write your WiFi password as UTF-8 text
4. **Write Toggl Token**:
   - Select Toggl Token characteristic (6ba7b813-...)
   - Write your Toggl API token as UTF-8 text
5. **Write Workspace ID**:
   - Select Workspace ID characteristic (6ba7b814-...)
   - Write your Toggl workspace ID as UTF-8 text
6. **Write Project IDs**:
   - Select Project IDs characteristic (6ba7b815-...)
   - Write 24 bytes (6 integers): `01 00 00 00 02 00 00 00 03 00 00 00 04 00 00 00 05 00 00 00 06 00 00 00`

### Expected Serial Output:
```
WiFi SSID received (X bytes): YourNetworkName
WiFi password received (X bytes) - hidden for security
Toggl token received (X bytes) - hidden for security  
Workspace ID received (X bytes): 12345
Project IDs data received: 24 bytes
Project IDs parsed successfully:
  Orientation[0]: 1
  Orientation[1]: 2
  Orientation[2]: 3
  Orientation[3]: 4
  Orientation[4]: 5
  Orientation[5]: 6
Complete configuration received
WiFi SSID: YourNetworkName
Toggl Workspace ID: 12345
Project IDs configured: 1, 2, 3, 4, 5, 6
State transition: setup_mode -> connecting
Status updated: connecting
Ready to start WiFi connection process
```

### Expected LED Change:
- **RP2040 Connect**: Changes to yellow/dim yellow
- **Nano 33 IoT**: Changes to fast double-pulse pattern

**✅ PASS CRITERIA**:
- [ ] All characteristics accept data without errors
- [ ] Serial shows proper data reception and parsing
- [ ] Device transitions to CONNECTING state
- [ ] LED changes to connecting pattern
- [ ] Status characteristic updates to "connecting"

---

## Test 4: WiFi Connection Test
**Goal**: Verify device attempts WiFi connection with received credentials

### Prerequisites:
- Ensure WiFi credentials are correct and network is available
- Device should be in CONNECTING state from Test 3

### Expected Serial Output (Success Path):
```
Connecting to WiFi with SSID YourNetworkName
................
Connected! IP address: 192.168.1.XXX
Saving configuration to EEPROM...
Configuration saved successfully
State transition: connecting -> connected
Status updated: connected
```

### Expected LED Change:
- **RP2040 Connect**: Changes to green/dim green
- **Nano 33 IoT**: Changes to solid medium brightness

### Expected BLE Behavior:
- BLE advertising should **stop** (device no longer discoverable)
- nRF Connect should show disconnection

**✅ PASS CRITERIA**:
- [ ] Serial shows WiFi connection attempt
- [ ] Serial shows successful IP address assignment
- [ ] Configuration saves successfully  
- [ ] Device transitions to CONNECTED state
- [ ] LED changes to connected pattern
- [ ] BLE advertising stops

---

## Test 5: Normal Operation Resume
**Goal**: Verify device exits BLE mode and resumes time tracking

### Expected Serial Output:
```
State transition: connected -> connected
[Device exits BLE mode and resumes normal operation]
[IMU orientation detection begins]
TimeTracker Cube Ready!
```

### Expected Behavior:
1. **Move device** to different orientations
2. **LED should change** based on orientation:
   - **RP2040**: Different colors per orientation
   - **33 IoT**: Different blink patterns (1-6 blinks)

### Expected Serial Output on Orientation Change:
```
Orientation: Face Down (Red) - X: 0.XX, Y: 0.XX, Z: -0.XX
Stopping current time entry...
[Toggl API calls with configured credentials]
Starting time entry: Face Down
```

**✅ PASS CRITERIA**:
- [ ] Device exits BLE mode cleanly
- [ ] Orientation detection works
- [ ] LED patterns change with orientation
- [ ] Toggl API calls use configured credentials
- [ ] Time entries start/stop properly

---

## Test 6: Error Handling - Wrong WiFi Credentials
**Goal**: Verify device handles WiFi connection failures gracefully

### Steps:
1. **Repeat Tests 1-3** with **incorrect WiFi password**
2. **Observe error handling**

### Expected Serial Output:
```
Connecting to WiFi with SSID YourNetworkName
....................
WiFi connection failed after maximum attempts
Error: WiFi connection failed
State transition: connecting -> error
Status updated: error
State transition: error -> setup_mode  
Status updated: setup_mode
```

### Expected LED Behavior:
- **RP2040**: Brief red flashing, then return to blue
- **33 IoT**: Triple flash pattern, then return to slow pulse

### Expected BLE Behavior:
- Device should remain **discoverable** for reconfiguration
- Can repeat configuration process

**✅ PASS CRITERIA**:
- [ ] WiFi failure detected and reported
- [ ] Device transitions through ERROR_STATE  
- [ ] Returns to SETUP_MODE for retry
- [ ] LED shows error then setup patterns
- [ ] BLE remains active for reconfiguration

---

## Test 7: Stored Configuration Boot
**Goal**: Verify device uses stored configuration on subsequent boots

### Steps:
1. **After successful Test 4**, power cycle the device
2. **Restart device** (should have stored configuration)

### Expected Serial Output:
```
TimeTracker Cube Starting...
Initializing memory-based configuration storage
Configuration loaded successfully
Connecting to WiFi with SSID YourNetworkName
Connected! IP address: 192.168.1.XXX
TimeTracker Cube Ready!
[Normal orientation detection begins immediately]
```

### Expected Behavior:
- **NO BLE mode** - device should connect directly to WiFi
- **Normal operation** starts immediately
- **Orientation detection** works with stored Toggl config

**✅ PASS CRITERIA**:
- [ ] Device boots directly to normal mode (no BLE)
- [ ] WiFi connects automatically with stored credentials
- [ ] Toggl API uses stored configuration
- [ ] Time tracking works immediately

---

## Debug Commands for Serial Monitor

```cpp
// If you need to add debug commands to main.cpp for testing:

void printStoredConfig() {
    if (configStorage.hasValidConfiguration()) {
        Serial.println("=== Stored Configuration ===");
        Serial.println("WiFi SSID: " + configStorage.getWifiSSID());
        Serial.println("Workspace ID: " + configStorage.getWorkspaceId());
        Serial.print("Project IDs: ");
        const int* ids = configStorage.getProjectIds();
        for (int i = 0; i < 6; i++) {
            Serial.print(ids[i]);
            if (i < 5) Serial.print(", ");
        }
        Serial.println();
    } else {
        Serial.println("No valid stored configuration");
    }
}
```

## Troubleshooting Common Issues

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Device not discoverable | BLE init failed | Check ArduinoBLE library, reset device |
| Can't write characteristics | Wrong data format | Use UTF-8 text for strings, hex bytes for Project IDs |
| WiFi always fails | Wrong credentials | Double-check SSID/password, ensure 2.4GHz network |
| LED not changing | Hardware issue | Check board type detection in serial output |
| No serial output | Wrong baud rate | Ensure 115200 baud in serial monitor |

This testing plan will thoroughly verify that Phase 2 is working correctly on your actual hardware!