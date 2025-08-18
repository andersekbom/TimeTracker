#ifndef BLE_CONFIG_SERVICE_H
#define BLE_CONFIG_SERVICE_H

#include <Arduino.h>
#include <ArduinoBLE.h>

// Configuration State Machine states
enum ConfigState {
    SETUP_MODE,      // Device advertising and waiting for configuration
    CONNECTING,      // Attempting WiFi connection
    CONNECTED,       // Successfully connected and operational
    ERROR_STATE      // Error occurred, needs attention
};

class BLEConfigService {
private:
    // BLE initialized flag
    bool bleInitialized;
    
    // Configuration data
    String receivedSSID;
    String receivedPassword;
    String receivedToken;
    String receivedWorkspaceId;
    int receivedProjectIds[6];
    String currentStatus;
    
    // State machine
    ConfigState currentState;
    unsigned long lastStateChange;
    
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
    
    // State machine management
    ConfigState getCurrentState() const { return currentState; }
    void setState(ConfigState newState);
    const char* getStateDescription() const;
    bool canTransitionTo(ConfigState newState) const;
    
    // Configuration validation
    bool hasValidWifiConfig() const;
    bool hasValidTogglConfig() const;
    bool isConfigurationComplete() const;
    
    // Clear received data
    void clearConfiguration();
    
    // Configuration processing
    void processConfiguration();
};

#endif // BLE_CONFIG_SERVICE_H