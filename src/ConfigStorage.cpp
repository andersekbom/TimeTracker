#include "ConfigStorage.h"

ConfigStorage::ConfigStorage() {
    // Initialize config structure
    memset(&config, 0, sizeof(StoredConfig));
    config.version = CONFIG_VERSION;
    config.isValid = false;
}

bool ConfigStorage::begin() {
    Serial.println("Initializing memory-based configuration storage");
    // For now, just initialize with empty config
    // In production, this would load from flash storage
    config.isValid = false;
    return true;
}

uint16_t ConfigStorage::calculateChecksum(const StoredConfig& cfg) const {
    uint16_t checksum = 0;
    const uint8_t* data = (const uint8_t*)&cfg;
    
    // Calculate checksum excluding the checksum field itself
    for (size_t i = 0; i < sizeof(StoredConfig); i++) {
        if (i != offsetof(StoredConfig, checksum) && 
            i != offsetof(StoredConfig, checksum) + 1) {
            checksum += data[i];
        }
    }
    
    return checksum;
}

bool ConfigStorage::validateChecksum(const StoredConfig& cfg) const {
    uint16_t expected = calculateChecksum(cfg);
    return cfg.checksum == expected;
}

bool ConfigStorage::saveConfiguration(const String& ssid, const String& password, 
                                     const String& token, const String& workspace,
                                     const int* projects) {
    Serial.println("Saving configuration to EEPROM...");
    
    // Clear the structure
    memset(&config, 0, sizeof(StoredConfig));
    
    // Set version
    config.version = CONFIG_VERSION;
    
    // Copy string data with bounds checking
    strncpy(config.wifiSSID, ssid.c_str(), sizeof(config.wifiSSID) - 1);
    strncpy(config.wifiPassword, password.c_str(), sizeof(config.wifiPassword) - 1);
    strncpy(config.togglToken, token.c_str(), sizeof(config.togglToken) - 1);
    strncpy(config.workspaceId, workspace.c_str(), sizeof(config.workspaceId) - 1);
    
    // Copy project IDs
    if (projects) {
        memcpy(config.projectIds, projects, sizeof(config.projectIds));
    }
    
    // Mark as valid
    config.isValid = true;
    
    // Calculate and set checksum
    config.checksum = calculateChecksum(config);
    
    // For now, just keep in memory (no persistent storage)
    // TODO: Implement flash storage for production
    Serial.println("Configuration saved to memory (not persistent across power cycles)");
    return true;
}

bool ConfigStorage::loadConfiguration() {
    Serial.println("Loading configuration from memory...");
    
    // For memory-based storage, configuration is only valid if it was set this session
    if (!config.isValid) {
        Serial.println("No valid configuration in memory");
        return false;
    }
    
    // Validate version
    if (config.version != CONFIG_VERSION) {
        Serial.print("Invalid configuration version: ");
        Serial.println(config.version);
        config.isValid = false;
        return false;
    }
    
    // Validate checksum
    if (!validateChecksum(config)) {
        Serial.println("Configuration checksum validation failed");
        config.isValid = false;
        return false;
    }
    
    Serial.println("Configuration loaded and validated successfully");
    return true;
}

bool ConfigStorage::hasValidConfiguration() const {
    return config.isValid && 
           strlen(config.wifiSSID) > 0 && 
           strlen(config.wifiPassword) > 0 &&
           strlen(config.togglToken) > 0 &&
           strlen(config.workspaceId) > 0;
}

void ConfigStorage::clearConfiguration() {
    Serial.println("Clearing configuration...");
    
    memset(&config, 0, sizeof(StoredConfig));
    config.version = CONFIG_VERSION;
    config.isValid = false;
    
    // For memory-based storage, just clear the in-memory config
    // TODO: Implement flash storage clear for production
    
    Serial.println("Configuration cleared");
}

void ConfigStorage::printConfiguration() const {
    Serial.println("=== Configuration Status ===");
    Serial.print("Version: ");
    Serial.println(config.version);
    Serial.print("Valid: ");
    Serial.println(config.isValid ? "Yes" : "No");
    Serial.print("Checksum: ");
    Serial.println(config.checksum);
    
    if (config.isValid) {
        Serial.print("WiFi SSID: ");
        Serial.println(config.wifiSSID);
        Serial.println("WiFi Password: [HIDDEN]");
        Serial.println("Toggl Token: [HIDDEN]");
        Serial.print("Workspace ID: ");
        Serial.println(config.workspaceId);
        
        Serial.println("Project IDs:");
        for (int i = 0; i < 6; i++) {
            Serial.print("  [" + String(i) + "]: ");
            Serial.println(config.projectIds[i]);
        }
    }
    Serial.println("============================");
}