# Setting Up Credentials for Development

For testing and development purposes, you can use file-based configuration instead of BLE setup.

## Quick Setup

1. **Copy the template file:**
   ```bash
   cp src/Configuration.cpp.template src/Configuration.cpp
   ```

2. **Edit `src/Configuration.cpp` with your actual credentials:**
   - Replace `YOUR_WIFI_SSID` with your WiFi network name
   - Replace `YOUR_WIFI_PASSWORD` with your WiFi password
   - Replace `YOUR_TOGGL_API_TOKEN` with your Toggl API token
   - Replace `YOUR_WORKSPACE_ID` with your Toggl workspace ID
   - Update the `orientationProjectIds` array with your actual Toggl project IDs

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