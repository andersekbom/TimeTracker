#include "BLEMocks.h"
#include <ArduinoBLE.h>

// Mock BLE service state
static bool bleInitialized = false;
static bool bleConfigComplete = false;
static String mockWifiSSID = "";
static String mockWifiPassword = "";
static String mockTogglToken = "";
static String mockWorkspaceId = "";
static int mockProjectIds[6] = {0, 0, 0, 0, 0, 0};

bool simpleBLEBegin() {
    // Initialize BLE if not already done
    if (!bleInitialized) {
        bool result = BLE.begin();
        if (result) {
            bleInitialized = true;
            Serial.println("Mock BLE service initialized");
        }
        return result;
    }
    return true;
}

void simpleBLEPoll() {
    if (bleInitialized) {
        BLE.poll();
    }
}

bool isConfigComplete() {
    return bleConfigComplete && 
           mockWifiSSID.length() > 0 && 
           mockWifiPassword.length() > 0 &&
           mockTogglToken.length() > 0 &&
           mockWorkspaceId.length() > 0;
}

String getWifiSSID() {
    return mockWifiSSID;
}

String getWifiPassword() {
    return mockWifiPassword;
}

String getTogglToken() {
    return mockTogglToken;
}

String getWorkspaceId() {
    return mockWorkspaceId;
}

const int* getProjectIds() {
    return mockProjectIds;
}

bool hasPendingManagementCommand() {
    // For testing, assume no pending commands initially
    return false;
}

String getPendingManagementCommand() {
    return "";
}

bool processManagementCommand(const String& command) {
    // Mock command processing
    Serial.print("Processing mock management command: ");
    Serial.println(command);
    
    if (command == "factory_reset") {
        // Reset mock data
        mockWifiSSID = "";
        mockWifiPassword = "";
        mockTogglToken = "";
        mockWorkspaceId = "";
        for (int i = 0; i < 6; i++) {
            mockProjectIds[i] = 0;
        }
        bleConfigComplete = false;
        return true;
    } else if (command == "backup_config") {
        // Mock backup operation
        return true;
    } else if (command == "restore_config") {
        // Mock restore operation
        return true;
    } else if (command == "get_diagnostics") {
        // Mock diagnostics
        return true;
    } else if (command == "restart_device") {
        // Mock restart
        return true;
    }
    
    return false; // Unknown command
}

void updateEnhancedBLECharacteristics() {
    // Mock characteristic update
    if (bleInitialized) {
        Serial.println("Mock BLE characteristics updated");
    }
}

// Helper functions for test setup
void setMockWiFiCredentials(const String& ssid, const String& password) {
    mockWifiSSID = ssid;
    mockWifiPassword = password;
}

void setMockTogglCredentials(const String& token, const String& workspace) {
    mockTogglToken = token;
    mockWorkspaceId = workspace;
}

void setMockProjectIds(const int* projects) {
    if (projects) {
        for (int i = 0; i < 6; i++) {
            mockProjectIds[i] = projects[i];
        }
    }
}

void setMockConfigComplete(bool complete) {
    bleConfigComplete = complete;
}