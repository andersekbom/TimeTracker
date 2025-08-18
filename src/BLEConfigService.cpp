#include "BLEConfigService.h"

// TimeTracker Base UUID: 6ba7b8xx-9dad-11d1-80b4-00c04fd430c8
// Service and characteristics use incremental xx values for easy identification
//
// UUID Allocation:
// 0x10: Configuration Service
// 0x11: WiFi SSID Characteristic  
// 0x12: WiFi Password Characteristic
// 0x13: Toggl Token Characteristic
// 0x14: Workspace ID Characteristic
// 0x15: Project IDs Characteristic
// 0x16: Status Characteristic

// TimeTracker Configuration Service UUID (base + 0x10)
#define TIMETRACKER_SERVICE_UUID "6ba7b810-9dad-11d1-80b4-00c04fd430c8"

// Characteristic UUIDs (base + 0x11, 0x12, 0x13, etc.)
#define WIFI_SSID_CHAR_UUID     "6ba7b811-9dad-11d1-80b4-00c04fd430c8"
#define WIFI_PASSWORD_CHAR_UUID "6ba7b812-9dad-11d1-80b4-00c04fd430c8"
#define TOGGL_TOKEN_CHAR_UUID   "6ba7b813-9dad-11d1-80b4-00c04fd430c8"
#define WORKSPACE_ID_CHAR_UUID  "6ba7b814-9dad-11d1-80b4-00c04fd430c8"
#define PROJECT_IDS_CHAR_UUID   "6ba7b815-9dad-11d1-80b4-00c04fd430c8"
#define STATUS_CHAR_UUID        "6ba7b816-9dad-11d1-80b4-00c04fd430c8"

// Static instance pointer
BLEConfigService* BLEConfigService::instance = nullptr;

BLEConfigService::BLEConfigService() :
    configService(TIMETRACKER_SERVICE_UUID),
    wifiSSIDChar(WIFI_SSID_CHAR_UUID, BLEWrite, 64),
    wifiPasswordChar(WIFI_PASSWORD_CHAR_UUID, BLEWrite, 64),
    togglTokenChar(TOGGL_TOKEN_CHAR_UUID, BLEWrite, 128),
    workspaceIdChar(WORKSPACE_ID_CHAR_UUID, BLEWrite, 16),
    projectIdsChar(PROJECT_IDS_CHAR_UUID, BLEWrite, 24), // 6 integers * 4 bytes
    statusChar(STATUS_CHAR_UUID, BLERead | BLENotify, 32),
    currentStatus("ready")
{
    // Set static instance pointer
    instance = this;
    
    // Initialize project IDs to 0
    for (int i = 0; i < 6; i++) {
        receivedProjectIds[i] = 0;
    }
}

bool BLEConfigService::begin() {
    // Set device name with last 4 hex digits of MAC address
    String macAddress = BLE.address();
    Serial.print("BLE MAC Address: ");
    Serial.println(macAddress);
    
    // Extract last 4 hex characters (last 2 bytes) from MAC address
    // MAC format is typically "XX:XX:XX:XX:XX:XX" (17 chars)
    String last4;
    if (macAddress.length() >= 17) {
        // Get last 2 bytes: positions 12-13 and 15-16 (skip colon at 14)
        last4 = macAddress.substring(12, 14) + macAddress.substring(15, 17);
    } else {
        // Fallback if MAC format is different
        last4 = macAddress.substring(macAddress.length() - 4);
        last4.replace(":", "");
    }
    
    String deviceName = "TimeTracker-" + last4;
    Serial.print("Generated Device Name: ");
    Serial.println(deviceName);
    
    BLE.setDeviceName(deviceName.c_str());
    BLE.setLocalName(deviceName.c_str());
    
    // Set advertised service
    BLE.setAdvertisedService(configService);
    
    // Add characteristics to service
    configService.addCharacteristic(wifiSSIDChar);
    configService.addCharacteristic(wifiPasswordChar);
    configService.addCharacteristic(togglTokenChar);
    configService.addCharacteristic(workspaceIdChar);
    configService.addCharacteristic(projectIdsChar);
    configService.addCharacteristic(statusChar);
    
    // Set initial status
    statusChar.writeValue(currentStatus.c_str());
    
    // Set event handlers using static functions
    wifiSSIDChar.setEventHandler(BLEWritten, staticWifiSSIDWritten);
    wifiPasswordChar.setEventHandler(BLEWritten, staticWifiPasswordWritten);
    togglTokenChar.setEventHandler(BLEWritten, staticTogglTokenWritten);
    workspaceIdChar.setEventHandler(BLEWritten, staticWorkspaceIdWritten);
    projectIdsChar.setEventHandler(BLEWritten, staticProjectIdsWritten);
    
    // Add service to BLE
    BLE.addService(configService);
    
    // Initialize BLE
    if (!BLE.begin()) {
        Serial.println("Starting BLE failed!");
        return false;
    }
    
    // Start advertising
    BLE.advertise();
    Serial.println("BLE Configuration Service started");
    Serial.println("Device name: " + deviceName);
    
    return true;
}

void BLEConfigService::poll() {
    BLE.poll();
}

void BLEConfigService::onWifiSSIDWritten(BLEDevice central, BLECharacteristic characteristic) {
    int length = characteristic.valueLength();
    if (length > 0 && length < 64) {  // Validate length
        const uint8_t* data = characteristic.value();
        receivedSSID = "";
        // Build string safely, ensuring null termination
        for (int i = 0; i < length; i++) {
            receivedSSID += (char)data[i];
        }
        Serial.print("WiFi SSID received (");
        Serial.print(length);
        Serial.print(" bytes): ");
        Serial.println(receivedSSID);
    } else {
        Serial.print("Invalid WiFi SSID length: ");
        Serial.println(length);
    }
}

void BLEConfigService::onWifiPasswordWritten(BLEDevice central, BLECharacteristic characteristic) {
    int length = characteristic.valueLength();
    if (length > 0 && length < 64) {  // Validate length
        const uint8_t* data = characteristic.value();
        receivedPassword = "";
        // Build string safely, ensuring null termination
        for (int i = 0; i < length; i++) {
            receivedPassword += (char)data[i];
        }
        Serial.print("WiFi password received (");
        Serial.print(length);
        Serial.println(" bytes) - hidden for security");
    } else {
        Serial.print("Invalid WiFi password length: ");
        Serial.println(length);
    }
}

void BLEConfigService::onTogglTokenWritten(BLEDevice central, BLECharacteristic characteristic) {
    int length = characteristic.valueLength();
    if (length > 0 && length < 128) {  // Validate length
        const uint8_t* data = characteristic.value();
        receivedToken = "";
        // Build string safely, ensuring null termination
        for (int i = 0; i < length; i++) {
            receivedToken += (char)data[i];
        }
        Serial.print("Toggl token received (");
        Serial.print(length);
        Serial.println(" bytes) - hidden for security");
    } else {
        Serial.print("Invalid Toggl token length: ");
        Serial.println(length);
    }
}

void BLEConfigService::onWorkspaceIdWritten(BLEDevice central, BLECharacteristic characteristic) {
    int length = characteristic.valueLength();
    if (length > 0 && length < 16) {  // Validate length
        const uint8_t* data = characteristic.value();
        receivedWorkspaceId = "";
        // Build string safely, ensuring null termination
        for (int i = 0; i < length; i++) {
            receivedWorkspaceId += (char)data[i];
        }
        Serial.print("Workspace ID received (");
        Serial.print(length);
        Serial.print(" bytes): ");
        Serial.println(receivedWorkspaceId);
    } else {
        Serial.print("Invalid Workspace ID length: ");
        Serial.println(length);
    }
}

void BLEConfigService::onProjectIdsWritten(BLEDevice central, BLECharacteristic characteristic) {
    // Expecting 24 bytes (6 integers * 4 bytes each)
    const uint8_t* data = characteristic.value();
    int dataLength = characteristic.valueLength();
    
    Serial.print("Project IDs data received: ");
    Serial.print(dataLength);
    Serial.println(" bytes");
    
    if (dataLength == 24) {
        // Convert byte array to integers (little endian)
        for (int i = 0; i < 6; i++) {
            receivedProjectIds[i] = (data[i*4]) | 
                                   (data[i*4 + 1] << 8) | 
                                   (data[i*4 + 2] << 16) | 
                                   (data[i*4 + 3] << 24);
        }
        Serial.println("Project IDs parsed successfully:");
        for (int i = 0; i < 6; i++) {
            Serial.print("  Orientation[" + String(i) + "]: ");
            Serial.println(receivedProjectIds[i]);
        }
    } else {
        Serial.print("Invalid project IDs data length - expected 24 bytes, got ");
        Serial.println(dataLength);
        // Clear project IDs on invalid data
        for (int i = 0; i < 6; i++) {
            receivedProjectIds[i] = 0;
        }
    }
}

void BLEConfigService::setStatus(const String& status) {
    currentStatus = status;
    statusChar.writeValue(currentStatus.c_str());
    Serial.println("Status updated: " + currentStatus);
}

bool BLEConfigService::hasValidWifiConfig() const {
    return receivedSSID.length() > 0 && receivedPassword.length() > 0;
}

bool BLEConfigService::hasValidTogglConfig() const {
    return receivedToken.length() > 0 && receivedWorkspaceId.length() > 0;
}

bool BLEConfigService::isConfigurationComplete() const {
    return hasValidWifiConfig() && hasValidTogglConfig();
}

void BLEConfigService::clearConfiguration() {
    receivedSSID = "";
    receivedPassword = "";
    receivedToken = "";
    receivedWorkspaceId = "";
    for (int i = 0; i < 6; i++) {
        receivedProjectIds[i] = 0;
    }
    setStatus("ready");
    Serial.println("Configuration cleared");
}

// Static callback functions
void BLEConfigService::staticWifiSSIDWritten(BLEDevice central, BLECharacteristic characteristic) {
    if (instance) {
        instance->onWifiSSIDWritten(central, characteristic);
    }
}

void BLEConfigService::staticWifiPasswordWritten(BLEDevice central, BLECharacteristic characteristic) {
    if (instance) {
        instance->onWifiPasswordWritten(central, characteristic);
    }
}

void BLEConfigService::staticTogglTokenWritten(BLEDevice central, BLECharacteristic characteristic) {
    if (instance) {
        instance->onTogglTokenWritten(central, characteristic);
    }
}

void BLEConfigService::staticWorkspaceIdWritten(BLEDevice central, BLECharacteristic characteristic) {
    if (instance) {
        instance->onWorkspaceIdWritten(central, characteristic);
    }
}

void BLEConfigService::staticProjectIdsWritten(BLEDevice central, BLECharacteristic characteristic) {
    if (instance) {
        instance->onProjectIdsWritten(central, characteristic);
    }
}