#include <Arduino.h>
#include <ArduinoBLE.h>

// Simple BLE configuration without complex constructors
// Using global variables to avoid constructor issues

// Service and characteristics - declared but not initialized until begin()
BLEService* configService = nullptr;
BLEStringCharacteristic* wifiSSIDChar = nullptr;  
BLEStringCharacteristic* wifiPasswordChar = nullptr;
BLEStringCharacteristic* togglTokenChar = nullptr;
BLEStringCharacteristic* statusChar = nullptr;

// Configuration data storage
String receivedSSID = "";
String receivedPassword = "";
String receivedToken = "";
String receivedWorkspace = "";
bool configComplete = false;

// UUIDs
#define TIMETRACKER_SERVICE_UUID "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
#define WIFI_SSID_CHAR_UUID     "6ba7b811-9dad-11d1-80b4-00c04fd430c8"
#define WIFI_PASSWORD_CHAR_UUID "6ba7b812-9dad-11d1-80b4-00c04fd430c8"
#define TOGGL_TOKEN_CHAR_UUID   "6ba7b813-9dad-11d1-80b4-00c04fd430c8"
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
    if (length > 0 && length < 128) {
        const uint8_t* data = characteristic.value();
        receivedToken = "";
        for (int i = 0; i < length; i++) {
            receivedToken += (char)data[i];
        }
        Serial.println("Toggl token received (hidden for security)");
        
        // Check if config is complete
        if (receivedSSID.length() > 0 && receivedPassword.length() > 0 && receivedToken.length() > 0) {
            configComplete = true;
            Serial.println("Configuration complete! Ready to test WiFi connection.");
            if (statusChar) {
                statusChar->writeValue("config_complete");
            }
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
    togglTokenChar = new BLEStringCharacteristic(TOGGL_TOKEN_CHAR_UUID, BLEWrite, 128);
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
    
    // Add characteristics to service
    configService->addCharacteristic(*wifiSSIDChar);
    configService->addCharacteristic(*wifiPasswordChar);
    configService->addCharacteristic(*togglTokenChar);
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