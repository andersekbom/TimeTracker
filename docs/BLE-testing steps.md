BLE and configuration flow:
1. Press "Start Scan". Result: "Scanning..." is displayed. Device is visible in list with "Connect" option.
2. Press "Connect". Result: Device is connected via BLE. Device is visible in list with "Configure" and "Disconnect" options.
3. Press "Disconnect". Result: Device is visible in list with "Connect" option. Device is still visible when scanning.
4. Press "Connect" again. Result: Device is connected via BLE. Device is visible in list with "Configure" and "Disconnect" options.
5. Press "Configure". Result: Configuration screen is displayed. Device is still connected via BLE.
6. Press "Save configuration". Result: Configuration is sent to Device. Device list is displayed. Device is still connected via BLE, and visible in list with "Configure" and "Disconnect" options. Device connects to Wifi (we assume that credentials are valid and connection successful). 
7. Press "Configure" again. Result: Configuration screen is displayed. Device is still connected via BLE.
6. Press "Save configuration". Result: Configuration is sent to Device. Device list is displayed. Device is still connected via BLE, and visible in list with "Configure" and "Disconnect" options. Device reconnects to Wifi (we assume that credentials are valid and connection successful). 

Important: Regardless of confguration and wifi connection status, it should always be possible to connect to and configure the Device over BLE.

BLE scanning and connecting requirements:
- When scanning, store all detected device names in the list, so that they can be used when connecting to the devices.
- When I connect to a device, the BLE scanning should stop.
- When I disconnect from the Device, the devicename should be saved so that I can quickly reconnect.
- Only when actively scanning should the list of device names be cleared.

Device configuration requirements:
- The tracker service configuration should only cover the API token and workspace ID, not the project IDs.
- When configuring a device, you should be able to select a verified provider.
- The project IDs should be entered when configuring the device after selecting the provider.