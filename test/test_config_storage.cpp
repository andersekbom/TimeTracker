#include <unity.h>
#include <Arduino.h>
#include "ConfigStorage.h"

// Test fixtures
ConfigStorage* storage;

void setUp(void) {
    storage = new ConfigStorage();
    storage->begin();
}

void tearDown(void) {
    delete storage;
}

// Basic Configuration Tests
void test_config_storage_initialization(void) {
    TEST_ASSERT_TRUE_MESSAGE(storage != nullptr, "ConfigStorage should initialize");
    TEST_ASSERT_FALSE_MESSAGE(storage->hasValidConfiguration(), "Fresh storage should have no valid config");
}

void test_config_storage_save_and_load(void) {
    // Test data
    String ssid = "TestNetwork";
    String password = "TestPassword123";
    String token = "test_token_12345678901234567890";
    String workspace = "123456";
    int projects[] = {0, 111, 222, 333, 444, 555};
    
    // Save configuration
    bool saveResult = storage->saveConfiguration(ssid, password, token, workspace, projects);
    TEST_ASSERT_TRUE_MESSAGE(saveResult, "Configuration should save successfully");
    
    // Verify configuration is valid
    TEST_ASSERT_TRUE_MESSAGE(storage->hasValidConfiguration(), "Saved configuration should be valid");
    
    // Verify data integrity
    TEST_ASSERT_EQUAL_STRING_MESSAGE(ssid.c_str(), storage->getWifiSSID().c_str(), "SSID should match");
    TEST_ASSERT_EQUAL_STRING_MESSAGE(password.c_str(), storage->getWifiPassword().c_str(), "Password should match");
    TEST_ASSERT_EQUAL_STRING_MESSAGE(token.c_str(), storage->getTogglToken().c_str(), "Token should match");
    TEST_ASSERT_EQUAL_STRING_MESSAGE(workspace.c_str(), storage->getWorkspaceId().c_str(), "Workspace should match");
    
    // Verify project IDs
    const int* savedProjects = storage->getProjectIds();
    for (int i = 0; i < 6; i++) {
        TEST_ASSERT_EQUAL_INT_MESSAGE(projects[i], savedProjects[i], "Project IDs should match");
    }
}

void test_wifi_validation(void) {
    // Valid WiFi credentials
    TEST_ASSERT_TRUE_MESSAGE(storage->validateWiFiCredentials("TestNetwork", "password123"), "Valid WiFi should pass");
    
    // Invalid WiFi credentials
    TEST_ASSERT_FALSE_MESSAGE(storage->validateWiFiCredentials("", "password123"), "Empty SSID should fail");
    TEST_ASSERT_FALSE_MESSAGE(storage->validateWiFiCredentials("TestNetwork", ""), "Empty password should fail");
    TEST_ASSERT_FALSE_MESSAGE(storage->validateWiFiCredentials("TestNetwork", "short"), "Short password should fail");
}

void test_toggl_validation(void) {
    // Valid Toggl credentials
    TEST_ASSERT_TRUE_MESSAGE(storage->validateTogglCredentials("valid_token_123456789", "123456"), "Valid Toggl should pass");
    
    // Invalid Toggl credentials
    TEST_ASSERT_FALSE_MESSAGE(storage->validateTogglCredentials("", "123456"), "Empty token should fail");
    TEST_ASSERT_FALSE_MESSAGE(storage->validateTogglCredentials("valid_token_123", ""), "Empty workspace should fail");
    TEST_ASSERT_FALSE_MESSAGE(storage->validateTogglCredentials("short", "123456"), "Short token should fail");
}

void test_backup_restore(void) {
    // Save initial configuration
    String ssid = "OriginalNetwork";
    String password = "OriginalPass123";
    String token = "original_token_123456789";
    String workspace = "111111";
    int projects[] = {0, 100, 200, 300, 400, 500};
    
    storage->saveConfiguration(ssid, password, token, workspace, projects);
    TEST_ASSERT_TRUE_MESSAGE(storage->hasValidConfiguration(), "Original config should be valid");
    
    // Create backup
    bool backupResult = storage->createBackup();
    TEST_ASSERT_TRUE_MESSAGE(backupResult, "Backup creation should succeed");
    
    // Modify configuration
    storage->saveConfiguration("NewNetwork", "NewPass123", "new_token_987654321", "222222", nullptr);
    TEST_ASSERT_EQUAL_STRING_MESSAGE("NewNetwork", storage->getWifiSSID().c_str(), "Config should be modified");
    
    // Restore from backup
    bool restoreResult = storage->restoreFromBackup();
    TEST_ASSERT_TRUE_MESSAGE(restoreResult, "Restore should succeed");
    
    // Verify original configuration is restored
    TEST_ASSERT_EQUAL_STRING_MESSAGE(ssid.c_str(), storage->getWifiSSID().c_str(), "SSID should be restored");
}

// Test suite runner
void runConfigStorageTests(void) {
    RUN_TEST(test_config_storage_initialization);
    RUN_TEST(test_config_storage_save_and_load);
    RUN_TEST(test_wifi_validation);
    RUN_TEST(test_toggl_validation);
    RUN_TEST(test_backup_restore);
}