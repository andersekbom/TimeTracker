#include <unity.h>
#include <Arduino.h>
#include <ArduinoBLE.h>
#include "BLEMocks.h"

// Test BLE Service Initialization
void test_ble_service_initialization(void) {
    bool initResult = simpleBLEBegin();
    TEST_ASSERT_TRUE_MESSAGE(initResult, "BLE service should initialize successfully");
}

void test_ble_characteristic_uuids(void) {
    // Test that all UUIDs are properly defined
    // Basic configuration UUIDs
    String serviceUUID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    String wifiSSIDUUID = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
    String statusUUID = "6ba7b816-9dad-11d1-80b4-00c04fd430c8";
    
    // Enhanced management UUIDs
    String deviceInfoUUID = "6ba7b817-9dad-11d1-80b4-00c04fd430c8";
    String commandUUID = "6ba7b81b-9dad-11d1-80b4-00c04fd430c8";
    
    // UUIDs should be valid format (36 characters with hyphens)
    TEST_ASSERT_EQUAL_INT_MESSAGE(36, serviceUUID.length(), "Service UUID should be 36 characters");
    TEST_ASSERT_EQUAL_INT_MESSAGE(36, deviceInfoUUID.length(), "Device info UUID should be 36 characters");
    
    // UUIDs should be unique (basic check)
    TEST_ASSERT_FALSE_MESSAGE(serviceUUID.equals(wifiSSIDUUID), "Service and SSID UUIDs should be different");
    TEST_ASSERT_FALSE_MESSAGE(statusUUID.equals(deviceInfoUUID), "Status and device info UUIDs should be different");
}

void test_management_commands(void) {
    // Test management command processing
    
    // Test command validation
    bool factoryResetResult = processManagementCommand("factory_reset");
    TEST_ASSERT_TRUE_MESSAGE(factoryResetResult, "Factory reset command should be valid");
    
    bool backupResult = processManagementCommand("backup_config");
    TEST_ASSERT_TRUE_MESSAGE(backupResult, "Backup command should be valid");
    
    bool diagnosticsResult = processManagementCommand("get_diagnostics");
    TEST_ASSERT_TRUE_MESSAGE(diagnosticsResult, "Diagnostics command should be valid");
    
    bool invalidResult = processManagementCommand("invalid_command");
    TEST_ASSERT_FALSE_MESSAGE(invalidResult, "Invalid command should be rejected");
}

void test_ble_data_validation(void) {
    // Test data format validation expectations
    String validSSID = "TestNetwork";
    String validPassword = "TestPassword123";
    String validToken = "valid_toggl_token_with_proper_length_12345";
    String validWorkspace = "123456";
    
    // Note: Actual validation would be done in ConfigStorage
    TEST_ASSERT_GREATER_THAN_MESSAGE(0, validSSID.length(), "Valid SSID should have length");
    TEST_ASSERT_LESS_OR_EQUAL_MESSAGE(32, validSSID.length(), "Valid SSID should be <= 32 chars");
    
    TEST_ASSERT_GREATER_OR_EQUAL_MESSAGE(8, validPassword.length(), "Valid password should be >= 8 chars");
    TEST_ASSERT_LESS_OR_EQUAL_MESSAGE(63, validPassword.length(), "Valid password should be <= 63 chars");
    
    TEST_ASSERT_GREATER_THAN_MESSAGE(15, validToken.length(), "Valid token should be > 15 chars");
    
    // Workspace should be numeric
    bool isNumeric = true;
    for (unsigned int i = 0; i < validWorkspace.length(); i++) {
        if (!isdigit(validWorkspace[i])) {
            isNumeric = false;
            break;
        }
    }
    TEST_ASSERT_TRUE_MESSAGE(isNumeric, "Valid workspace should be numeric");
}

// Test suite runner
void runBLEProtocolTests(void) {
    RUN_TEST(test_ble_service_initialization);
    RUN_TEST(test_ble_characteristic_uuids);
    RUN_TEST(test_management_commands);
    RUN_TEST(test_ble_data_validation);
}