#include <Arduino.h>
#include <ArduinoBLE.h>

// Simple BLE configuration without complex constructors
// Using global variables to avoid constructor issues

// Service and characteristics - declared but not initialized until begin()
BLEService* configService = nullptr;
BLEStringCharacteristic* wifiSSIDChar = nullptr;  
BLEStringCharacteristic* wifiPasswordChar = nullptr;
BLEStringCharacteristic* togglTokenChar = nullptr;
BLEStringCharacteristic* workspaceIdChar = nullptr;
BLECharacteristic* projectIdsChar = nullptr;
BLEStringCharacteristic* statusChar = nullptr;

// Configuration data storage
String receivedSSID = "";
String receivedPassword = "";
String receivedToken = "";
String receivedWorkspace = "";
int receivedProjectIds[6] = {0, 0, 0, 0, 0, 0};
bool configComplete = false;

// Forward declaration
void checkConfigComplete();

// UUIDs
#define TIMETRACKER_SERVICE_UUID "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
#define WIFI_SSID_CHAR_UUID     "6ba7b811-9dad-11d1-80b4-00c04fd430c8"
#define WIFI_PASSWORD_CHAR_UUID "6ba7b812-9dad-11d1-80b4-00c04fd430c8"
#define TOGGL_TOKEN_CHAR_UUID   "6ba7b813-9dad-11d1-80b4-00c04fd430c8"
#define WORKSPACE_ID_CHAR_UUID  "6ba7b814-9dad-11d1-80b4-00c04fd430c8"
#define PROJECT_IDS_CHAR_UUID   "6ba7b815-9dad-11d1-80b4-00c04fd430c8"
#define STATUS_CHAR_UUID        "6ba7b816-9dad-11d1-80b4-00c04fd430c8"

// Callback functions
void onWifiSSIDWritten(BLEDevice central, BLECharacteristic characteristic) {
    int length = characteristic.valueLength();
    if (length > 0 && length < 64) {
        const uint8_t* data = characteristic.value();
        receivedSSID = "";
        for (int i = 0; i < length; i++) {
            receivedSSID += (char)data[i];
        }
        Serial.print("WiFi SSID received: ");
        Serial.println(receivedSSID);
        
        // Update status
        if (statusChar) {
            statusChar->writeValue("ssid_received");
        }
    }
}

void onWifiPasswordWritten(BLEDevice central, BLECharacteristic characteristic) {
    int length = characteristic.valueLength();
    if (length > 0 && length < 64) {
        const uint8_t* data = characteristic.value();
        receivedPassword = "";
        for (int i = 0; i < length; i++) {
            receivedPassword += (char)data[i];
        }
        Serial.println("WiFi password received (hidden for security)");
        
        // Update status
        if (statusChar) {
            statusChar->writeValue("password_received");
        }
    }
}

void onTogglTokenWritten(BLEDevice central, BLECharacteristic characteristic) {
    int length = characteristic.valueLength();
    if (length > 0 && length < 256) {
        const uint8_t* data = characteristic.value();
        receivedToken = "";
        for (int i = 0; i < length; i++) {
            receivedToken += (char)data[i];
        }
        Serial.println("Toggl token received (hidden for security)");
        
        // Update status
        if (statusChar) {
            statusChar->writeValue("token_received");
        }
        
        checkConfigComplete();
    }
}

void onWorkspaceIdWritten(BLEDevice central, BLECharacteristic characteristic) {
    int length = characteristic.valueLength();
    if (length > 0 && length < 16) {
        const uint8_t* data = characteristic.value();
        receivedWorkspace = "";
        for (int i = 0; i < length; i++) {
            receivedWorkspace += (char)data[i];
        }
        Serial.print("Workspace ID received: ");
        Serial.println(receivedWorkspace);
        
        // Update status
        if (statusChar) {
            statusChar->writeValue("workspace_received");
        }
        
        checkConfigComplete();
    }
}

void onProjectIdsWritten(BLEDevice central, BLECharacteristic characteristic) {
    const uint8_t* data = characteristic.value();
    int dataLength = characteristic.valueLength();
    
    Serial.print("Project IDs data received: ");
    Serial.print(dataLength);
    Serial.println(" bytes");
    
    if (dataLength == 24) { // 6 integers * 4 bytes each
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
        
        // Update status
        if (statusChar) {
            statusChar->writeValue("projects_received");
        }
        
        checkConfigComplete();
    } else {
        Serial.print("Invalid project IDs data length - expected 24 bytes, got ");
        Serial.println(dataLength);
    }
}

void checkConfigComplete() {
    // Check if we have the minimum required configuration (WiFi + Toggl token)
    if (receivedSSID.length() > 0 && receivedPassword.length() > 0 && receivedToken.length() > 0) {
        configComplete = true;
        Serial.println("Minimum configuration complete! Ready to test WiFi connection.");
        if (statusChar) {
            statusChar->writeValue("config_complete");
        }
    }
}

bool simpleBLEBegin() {
    Serial.println("Starting Simple BLE Configuration Service...");
    
    // Initialize BLE
    if (!BLE.begin()) {
        Serial.println("ERROR: BLE.begin() failed!");
        return false;
    }
    
    Serial.println("BLE initialized successfully");
    
    // Create service and characteristics after BLE is initialized
    configService = new BLEService(TIMETRACKER_SERVICE_UUID);
    wifiSSIDChar = new BLEStringCharacteristic(WIFI_SSID_CHAR_UUID, BLEWrite, 64);
    wifiPasswordChar = new BLEStringCharacteristic(WIFI_PASSWORD_CHAR_UUID, BLEWrite, 64);
    togglTokenChar = new BLEStringCharacteristic(TOGGL_TOKEN_CHAR_UUID, BLEWrite, 256);
    workspaceIdChar = new BLEStringCharacteristic(WORKSPACE_ID_CHAR_UUID, BLEWrite, 16);
    projectIdsChar = new BLECharacteristic(PROJECT_IDS_CHAR_UUID, BLEWrite, 24); // 6 integers * 4 bytes
    statusChar = new BLEStringCharacteristic(STATUS_CHAR_UUID, BLERead | BLENotify, 32);
    
    // Set device name
    String macAddress = BLE.address();
    String last4 = macAddress.substring(macAddress.length() - 5);
    last4.replace(":", "");
    String deviceName = "TimeTracker-" + last4;
    
    BLE.setDeviceName(deviceName.c_str());
    BLE.setLocalName(deviceName.c_str());
    
    // Set initial status
    statusChar->writeValue("setup_mode");
    
    // Set event handlers
    wifiSSIDChar->setEventHandler(BLEWritten, onWifiSSIDWritten);
    wifiPasswordChar->setEventHandler(BLEWritten, onWifiPasswordWritten);
    togglTokenChar->setEventHandler(BLEWritten, onTogglTokenWritten);
    workspaceIdChar->setEventHandler(BLEWritten, onWorkspaceIdWritten);
    projectIdsChar->setEventHandler(BLEWritten, onProjectIdsWritten);
    
    // Add characteristics to service
    configService->addCharacteristic(*wifiSSIDChar);
    configService->addCharacteristic(*wifiPasswordChar);
    configService->addCharacteristic(*togglTokenChar);
    configService->addCharacteristic(*workspaceIdChar);
    configService->addCharacteristic(*projectIdsChar);
    configService->addCharacteristic(*statusChar);
    
    // Add service to BLE
    BLE.addService(*configService);
    BLE.setAdvertisedService(*configService);
    
    // Start advertising
    BLE.advertise();
    
    Serial.println("TimeTracker BLE service started");
    Serial.println("Device name: " + deviceName);
    Serial.println("Ready for configuration via nRF Connect");
    
    return true;
}

void simpleBLEPoll() {
    BLE.poll();
}

bool isConfigComplete() {
    return configComplete;
}

String getWifiSSID() {
    return receivedSSID;
}

String getWifiPassword() {
    return receivedPassword;
}

String getTogglToken() {
    return receivedToken;
}

String getWorkspaceId() {
    return receivedWorkspace;
}

const int* getProjectIds() {
    return receivedProjectIds;
}