#include "ConfigStorage.h"

ConfigStorage::ConfigStorage() {
    // Initialize config structure
    memset(&config, 0, sizeof(StoredConfig));
    config.version = CONFIG_VERSION;
    config.isValid = false;
    config.lastUpdateTime = 0;
    
    // Initialize backup structure
    memset(&backup, 0, sizeof(BackupConfig));
    backup.hasBackup = false;
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
    if (Serial) {
        Serial.print("ConfigStorage: Toggl token stored - input length: ");
        Serial.print(token.length());
        Serial.print(", buffer size: ");
        Serial.print(sizeof(config.togglToken));
        Serial.print(", stored length: ");
        Serial.println(strlen(config.togglToken));
    }
    strncpy(config.workspaceId, workspace.c_str(), sizeof(config.workspaceId) - 1);
    
    // Copy project IDs
    if (projects) {
        memcpy(config.projectIds, projects, sizeof(config.projectIds));
    }
    
    // Mark as valid and set timestamp
    config.isValid = true;
    config.lastUpdateTime = millis();
    
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

// Validation methods
bool ConfigStorage::validateWiFiCredentials(const String& ssid, const String& password) const {
    if (ssid.length() == 0 || ssid.length() > 32) {
        return false; // SSID must be 1-32 characters
    }
    if (password.length() < 8 || password.length() > 63) {
        return false; // WPA/WPA2 password must be 8-63 characters
    }
    return true;
}

bool ConfigStorage::validateTogglCredentials(const String& token, const String& workspace) const {
    // Toggl API tokens are typically 32 characters (hex format)
    // But allow some flexibility for different token formats
    if (token.length() < 16 || token.length() > 255) {
        if (Serial) {
            Serial.println("Token validation failed - length: " + String(token.length()) + " (expected 16-255)");
        }
        return false; // Token too short or too long
    }
    if (workspace.length() == 0) {
        return false; // Workspace ID required
    }
    
    // Check if workspace is numeric
    for (unsigned int i = 0; i < workspace.length(); i++) {
        if (!isdigit(workspace[i])) {
            return false;
        }
    }
    
    // Workspace should not be zero
    if (workspace.toInt() <= 0) {
        return false;
    }
    
    return true;
}

bool ConfigStorage::validateProjectIds(const int* projects) const {
    if (!projects) {
        return false; // Null pointer
    }
    
    for (int i = 0; i < 6; i++) {
        if (projects[i] < 0 || projects[i] >= 1000000000) {
            return false; // Invalid project ID range
        }
    }
    
    return true;
}

bool ConfigStorage::validateCompleteConfiguration(const StoredConfig& cfg) const {
    if (!cfg.isValid) {
        return false;
    }
    
    String ssid(cfg.wifiSSID);
    String password(cfg.wifiPassword);
    String token(cfg.togglToken);
    String workspace(cfg.workspaceId);
    
    return validateWiFiCredentials(ssid, password) &&
           validateTogglCredentials(token, workspace) &&
           validateProjectIds(cfg.projectIds);
}

// Backup and restore methods
bool ConfigStorage::createBackup() {
    Serial.println("Creating configuration backup...");
    
    if (!hasValidConfiguration()) {
        Serial.println("No valid configuration to backup");
        return false;
    }
    
    // Copy current config to backup
    memcpy(&backup.config, &config, sizeof(StoredConfig));
    backup.hasBackup = true;
    
    Serial.println("Configuration backup created");
    return true;
}

bool ConfigStorage::restoreFromBackup() {
    Serial.println("Restoring configuration from backup...");
    
    if (!backup.hasBackup) {
        Serial.println("No backup available");
        return false;
    }
    
    // Validate backup before restoring
    if (!validateCompleteConfiguration(backup.config)) {
        Serial.println("Backup configuration is invalid");
        return false;
    }
    
    // Restore from backup
    memcpy(&config, &backup.config, sizeof(StoredConfig));
    config.lastUpdateTime = millis();
    
    Serial.println("Configuration restored from backup");
    return true;
}

bool ConfigStorage::factoryReset() {
    Serial.println("Performing factory reset...");
    
    // Clear current configuration
    clearConfiguration();
    
    // Clear backup
    memset(&backup, 0, sizeof(BackupConfig));
    backup.hasBackup = false;
    
    Serial.println("Factory reset completed");
    return true;
}

// Versioning and diagnostics methods
uint32_t ConfigStorage::getLastUpdateTimestamp() const {
    return config.lastUpdateTime;
}

bool ConfigStorage::isStorageHealthy() const {
    // For memory-based storage, always healthy unless corrupted
    return hasValidConfiguration() ? validateCompleteConfiguration(config) : true;
}

size_t ConfigStorage::getStorageUsage() const {
    // For memory-based storage, return the size of our config structure
    return sizeof(StoredConfig) + sizeof(BackupConfig);
}