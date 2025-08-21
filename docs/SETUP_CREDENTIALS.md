# Device Configuration Options

## Recommended: Wireless BLE Configuration

**Use the TimeTracker Config mobile app for wireless setup:**

1. **Power on device** - enters BLE setup mode automatically (blue LED)
2. **Install mobile app** - Download APK from EAS Build or build from source
3. **Connect via app** - Scan for "TimeTracker-XXXX" devices
4. **Configure wirelessly:**
   - WiFi network and password
   - Toggl API token and workspace ID  
   - Project IDs for each cube orientation
5. **Complete setup** - Device saves configuration and starts normal operation

## Alternative: Manual File Configuration (Development Only)

For development and testing, you can bypass BLE setup:

1. **Copy template:** `cp src/Configuration.cpp.template src/Configuration.cpp`
2. **Edit credentials** in the new file with your actual values
3. **Rebuild and upload** firmware with embedded credentials

## Getting Toggl Credentials

1. **API Token**: Go to your [Toggl Profile](https://track.toggl.com/profile) and copy your API token
2. **Workspace ID**: You can find this in the URL when you're in your workspace, or use the Toggl API
3. **Project IDs**: Get these from your Toggl workspace or via the API

## Security Notes

- **Never commit `src/Configuration.cpp` to git** - it's in `.gitignore` for a reason
- The credentials file contains sensitive information
- For production use, prefer BLE configuration over file-based credentials
- If you accidentally commit credentials, rotate them immediately

## Example Configuration.cpp

```cpp
const char *ssid = "MyWiFiNetwork";
const char *password = "MySecretPassword";
const char *togglApiToken = "abcd1234567890abcd1234567890abcd";
const int workspaceId = 1234567;

// Set your actual project IDs for each orientation
const int orientationProjectIds[6] = {
    0,          // FACE_UP - break time (always 0)
    12345678,   // FACE_DOWN - your project ID
    12345679,   // LEFT_SIDE - your project ID
    12345680,   // RIGHT_SIDE - your project ID
    12345681,   // FRONT_EDGE - your project ID
    12345682    // BACK_EDGE - your project ID
};
```