#ifndef BLE_CONFIG_SERVICE_H
#define BLE_CONFIG_SERVICE_H

#include <Arduino.h>
#include <ArduinoBLE.h>

class BLEConfigService {
private:
    // BLE Service and Characteristics
    BLEService configService;
    BLEStringCharacteristic wifiSSIDChar;
    BLEStringCharacteristic wifiPasswordChar;
    BLEStringCharacteristic togglTokenChar;
    BLEStringCharacteristic workspaceIdChar;
    BLECharacteristic projectIdsChar;
    BLEStringCharacteristic statusChar;
    
    // Configuration data
    String receivedSSID;
    String receivedPassword;
    String receivedToken;
    String receivedWorkspaceId;
    int receivedProjectIds[6];
    String currentStatus;
    
    // Static instance pointer for callbacks
    static BLEConfigService* instance;
    
    // Internal methods
    void onWifiSSIDWritten(BLEDevice central, BLECharacteristic characteristic);
    void onWifiPasswordWritten(BLEDevice central, BLECharacteristic characteristic);
    void onTogglTokenWritten(BLEDevice central, BLECharacteristic characteristic);
    void onWorkspaceIdWritten(BLEDevice central, BLECharacteristic characteristic);
    void onProjectIdsWritten(BLEDevice central, BLECharacteristic characteristic);
    
    // Static callback functions
    static void staticWifiSSIDWritten(BLEDevice central, BLECharacteristic characteristic);
    static void staticWifiPasswordWritten(BLEDevice central, BLECharacteristic characteristic);
    static void staticTogglTokenWritten(BLEDevice central, BLECharacteristic characteristic);
    static void staticWorkspaceIdWritten(BLEDevice central, BLECharacteristic characteristic);
    static void staticProjectIdsWritten(BLEDevice central, BLECharacteristic characteristic);

public:
    BLEConfigService();
    
    bool begin();
    void poll();
    
    // Configuration getters
    String getWifiSSID() const { return receivedSSID; }
    String getWifiPassword() const { return receivedPassword; }
    String getTogglToken() const { return receivedToken; }
    String getWorkspaceId() const { return receivedWorkspaceId; }
    const int* getProjectIds() const { return receivedProjectIds; }
    
    // Status management
    void setStatus(const String& status);
    String getStatus() const { return currentStatus; }
    
    // Configuration validation
    bool hasValidWifiConfig() const;
    bool hasValidTogglConfig() const;
    bool isConfigurationComplete() const;
    
    // Clear received data
    void clearConfiguration();
};

#endif // BLE_CONFIG_SERVICE_H