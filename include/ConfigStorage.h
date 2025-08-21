#ifndef CONFIG_STORAGE_H
#define CONFIG_STORAGE_H

#include <Arduino.h>

// For now, use a simple memory-based approach for configuration storage
// This will persist for the duration of the power cycle, suitable for BLE config
// TODO: Implement proper flash storage for production

// Configuration storage structure
struct StoredConfig {
    uint16_t version;           // Configuration version
    uint16_t checksum;          // Data integrity check
    char wifiSSID[64];          // WiFi SSID
    char wifiPassword[64];      // WiFi password  
    char togglToken[256];       // Toggl API token
    char workspaceId[16];       // Toggl workspace ID
    int projectIds[6];          // Project IDs for each orientation
    uint32_t lastUpdateTime;    // Last update timestamp
    bool isValid;               // Configuration validity flag
};

// Backup configuration structure
struct BackupConfig {
    StoredConfig config;
    bool hasBackup;
};

class ConfigStorage {
private:
    static const uint16_t CONFIG_VERSION = 1;
    static const int EEPROM_SIZE = 1024;
    static const int CONFIG_START_ADDRESS = 0;
    
    StoredConfig config;
    BackupConfig backup;
    
    uint16_t calculateChecksum(const StoredConfig& cfg) const;
    bool validateChecksum(const StoredConfig& cfg) const;

public:
    ConfigStorage();
    
    bool begin();
    bool saveConfiguration(const String& ssid, const String& password, 
                          const String& token, const String& workspace,
                          const int* projects);
    bool loadConfiguration();
    bool hasValidConfiguration() const;
    void clearConfiguration();
    
    // Getters
    String getWifiSSID() const { return String(config.wifiSSID); }
    String getWifiPassword() const { return String(config.wifiPassword); }
    String getTogglToken() const { return String(config.togglToken); }
    String getWorkspaceId() const { return String(config.workspaceId); }
    const int* getProjectIds() const { return config.projectIds; }
    bool isConfigValid() const { return config.isValid; }
    
    // Validation methods
    bool validateWiFiCredentials(const String& ssid, const String& password) const;
    bool validateTogglCredentials(const String& token, const String& workspace) const;
    bool validateProjectIds(const int* projects) const;
    bool validateCompleteConfiguration(const StoredConfig& cfg) const;
    
    // Backup and restore
    bool createBackup();
    bool restoreFromBackup();
    bool factoryReset();
    
    // Versioning and diagnostics
    int getConfigurationVersion() const { return config.version; }
    uint32_t getLastUpdateTimestamp() const;
    bool isStorageHealthy() const;
    size_t getStorageUsage() const;
    
    // Debug
    void printConfiguration() const;
};

#endif // CONFIG_STORAGE_H