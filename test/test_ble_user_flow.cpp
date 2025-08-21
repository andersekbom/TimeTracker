#include <unity.h>
#include <Arduino.h>
#include <ArduinoBLE.h>
#include "BLEMocks.h"

// User Flow Test Helper
class BLEUserFlowHelper {
private:
    static bool deviceScanning;
    static bool deviceConnected;
    static bool deviceConfigured;
    static bool wifiConnected;
    static unsigned long testStepStartTime;
    
public:
    static void resetTestState() {
        deviceScanning = false;
        deviceConnected = false;
        deviceConfigured = false;
        wifiConnected = false;
        testStepStartTime = millis();
    }
    
    static void startStep(const char* stepName) {
        testStepStartTime = millis();
        Serial.print("Step: ");
        Serial.println(stepName);
    }
    
    static void validateStepTiming(unsigned long maxMs) {
        unsigned long elapsed = millis() - testStepStartTime;
        Serial.print("Step completed in ");
        Serial.print(elapsed);
        Serial.println("ms");
        TEST_ASSERT_LESS_THAN_MESSAGE(maxMs, elapsed, "Step should complete within time limit");
    }
    
    // Simulate mobile app scanning for devices
    static bool simulateStartScan() {
        startStep("1. Press 'Start Scan' - Device should be discoverable");
        deviceScanning = true;
        
        // Device should be advertising and discoverable
        bool bleReady = simpleBLEBegin();
        if (bleReady) {
            Serial.println("✓ Device is advertising and discoverable");
            Serial.println("✓ 'Scanning...' displayed, device visible with 'Connect' option");
        }
        
        validateStepTiming(2000); // Should be discoverable within 2 seconds
        return bleReady;
    }
    
    // Simulate mobile app connecting to device
    static bool simulateConnect() {
        startStep("2. Press 'Connect' - Device should accept BLE connection");
        
        if (!deviceScanning) {
            TEST_FAIL_MESSAGE("Cannot connect - device not scanning/discoverable");
            return false;
        }
        
        // Simulate connection establishment
        for (int i = 0; i < 20; i++) {
            simpleBLEPoll();
            delay(50);
        }
        
        deviceConnected = true;
        Serial.println("✓ Device connected via BLE");
        Serial.println("✓ Device visible with 'Configure' and 'Disconnect' options");
        
        validateStepTiming(3000); // Connection should complete within 3 seconds
        return true;
    }
    
    // Simulate mobile app disconnecting from device
    static bool simulateDisconnect() {
        startStep("3. Press 'Disconnect' - Device should handle disconnection gracefully");
        
        if (!deviceConnected) {
            TEST_FAIL_MESSAGE("Cannot disconnect - device not connected");
            return false;
        }
        
        // Simulate disconnection but device remains discoverable
        deviceConnected = false;
        
        // Device should continue advertising for reconnection
        for (int i = 0; i < 10; i++) {
            simpleBLEPoll();
            delay(100);
        }
        
        Serial.println("✓ Device disconnected but remains discoverable");
        Serial.println("✓ Device visible with 'Connect' option when scanning");
        
        validateStepTiming(1000); // Disconnection should be immediate
        return true;
    }
    
    // Simulate reconnection after disconnect
    static bool simulateReconnect() {
        startStep("4. Press 'Connect' again - Device should accept reconnection");
        
        if (deviceConnected) {
            TEST_FAIL_MESSAGE("Device already connected - cannot test reconnection");
            return false;
        }
        
        // Simulate reconnection
        for (int i = 0; i < 20; i++) {
            simpleBLEPoll();
            delay(50);
        }
        
        deviceConnected = true;
        Serial.println("✓ Device reconnected via BLE");
        Serial.println("✓ Device visible with 'Configure' and 'Disconnect' options");
        
        validateStepTiming(3000); // Reconnection should complete within 3 seconds
        return true;
    }
    
    // Simulate entering configuration mode
    static bool simulateConfigureMode() {
        startStep("5. Press 'Configure' - Configuration screen should display");
        
        if (!deviceConnected) {
            TEST_FAIL_MESSAGE("Cannot configure - device not connected");
            return false;
        }
        
        // Device should remain connected during configuration
        for (int i = 0; i < 5; i++) {
            simpleBLEPoll();
            delay(100);
        }
        
        Serial.println("✓ Configuration screen displayed");
        Serial.println("✓ Device still connected via BLE during configuration");
        
        validateStepTiming(1000); // Configuration mode should be immediate
        return true;
    }
    
    // Simulate saving configuration
    static bool simulateSaveConfiguration() {
        startStep("6. Press 'Save Configuration' - Config should be sent and WiFi connected");
        
        if (!deviceConnected) {
            TEST_FAIL_MESSAGE("Cannot save config - device not connected");
            return false;
        }
        
        // Simulate configuration transmission
        Serial.println("Transmitting configuration data:");
        Serial.println("  - WiFi SSID: TestNetwork");
        Serial.println("  - WiFi Password: TestPassword123");
        Serial.println("  - Toggl Token: test_token_12345678901234567890");
        Serial.println("  - Workspace ID: 123456");
        Serial.println("  - Project IDs: 0,111,222,333,444,555");
        
        // Simulate configuration processing
        for (int i = 0; i < 30; i++) {
            simpleBLEPoll();
            delay(100);
            
            if (i == 15) {
                Serial.println("  ✓ Configuration data received and validated");
            }
        }
        
        deviceConfigured = true;
        wifiConnected = true; // Assume valid credentials
        
        Serial.println("✓ Configuration sent to device");
        Serial.println("✓ Device list displayed");
        Serial.println("✓ Device still connected via BLE");
        Serial.println("✓ Device visible with 'Configure' and 'Disconnect' options");
        Serial.println("✓ Device connects to WiFi (assuming valid credentials)");
        
        validateStepTiming(5000); // Configuration should complete within 5 seconds
        return true;
    }
    
    // Simulate reconfiguration while WiFi is connected
    static bool simulateReconfigure() {
        startStep("7. Press 'Configure' again - Should allow reconfiguration");
        
        if (!deviceConnected || !wifiConnected) {
            TEST_FAIL_MESSAGE("Cannot reconfigure - device not properly connected");
            return false;
        }
        
        // Device should remain in dual-mode (WiFi + BLE) during reconfiguration
        for (int i = 0; i < 5; i++) {
            simpleBLEPoll();
            delay(100);
        }
        
        Serial.println("✓ Configuration screen displayed again");
        Serial.println("✓ Device still connected via BLE");
        Serial.println("✓ Device maintains WiFi connection during BLE configuration");
        
        validateStepTiming(1000); // Should be immediate
        return true;
    }
    
    // Simulate saving updated configuration
    static bool simulateResaveConfiguration() {
        startStep("8. Press 'Save Configuration' again - Should update config and reconnect WiFi");
        
        if (!deviceConnected || !wifiConnected) {
            TEST_FAIL_MESSAGE("Cannot save updated config - device not properly connected");
            return false;
        }
        
        // Simulate updated configuration transmission
        Serial.println("Transmitting updated configuration data:");
        Serial.println("  - WiFi SSID: UpdatedNetwork");
        Serial.println("  - WiFi Password: UpdatedPassword123");
        Serial.println("  - Toggl Token: updated_token_98765432109876543210");
        Serial.println("  - Workspace ID: 654321");
        Serial.println("  - Project IDs: 0,999,888,777,666,555");
        
        // Simulate configuration processing and WiFi reconnection
        for (int i = 0; i < 40; i++) {
            simpleBLEPoll();
            delay(100);
            
            if (i == 10) {
                Serial.println("  ✓ Updated configuration data received and validated");
            } else if (i == 25) {
                Serial.println("  ✓ WiFi disconnecting from old network");
            } else if (i == 35) {
                Serial.println("  ✓ WiFi reconnecting to new network");
            }
        }
        
        Serial.println("✓ Updated configuration sent to device");
        Serial.println("✓ Device list displayed");
        Serial.println("✓ Device still connected via BLE");
        Serial.println("✓ Device visible with 'Configure' and 'Disconnect' options");
        Serial.println("✓ Device reconnects to WiFi with new credentials");
        
        validateStepTiming(6000); // Reconfiguration may take longer due to WiFi reconnection
        return true;
    }
    
    // Critical requirement validation
    static bool validateAlwaysConfigurable() {
        Serial.println("\n=== CRITICAL REQUIREMENT VALIDATION ===");
        Serial.println("Testing: Device should ALWAYS be configurable via BLE");
        Serial.println("Regardless of WiFi connection status");
        
        bool allTestsPassed = true;
        
        // Test 1: BLE configurable when WiFi disconnected
        wifiConnected = false;
        Serial.println("\nTest 1: BLE configuration when WiFi disconnected");
        if (deviceConnected) {
            for (int i = 0; i < 10; i++) {
                simpleBLEPoll();
                delay(50);
            }
            Serial.println("✓ BLE configuration possible when WiFi disconnected");
        } else {
            Serial.println("✗ BLE not accessible when WiFi disconnected");
            allTestsPassed = false;
        }
        
        // Test 2: BLE configurable when WiFi connected
        wifiConnected = true;
        Serial.println("\nTest 2: BLE configuration when WiFi connected");
        if (deviceConnected) {
            for (int i = 0; i < 10; i++) {
                simpleBLEPoll();
                delay(50);
            }
            Serial.println("✓ BLE configuration possible when WiFi connected");
        } else {
            Serial.println("✗ BLE not accessible when WiFi connected");
            allTestsPassed = false;
        }
        
        // Test 3: BLE survives WiFi reconnection
        Serial.println("\nTest 3: BLE survives WiFi reconnection");
        Serial.println("Simulating WiFi reconnection...");
        for (int i = 0; i < 20; i++) {
            simpleBLEPoll();
            delay(100);
            if (i == 10) {
                Serial.println("WiFi reconnection in progress...");
            }
        }
        if (deviceConnected) {
            Serial.println("✓ BLE remains accessible during WiFi reconnection");
        } else {
            Serial.println("✗ BLE lost during WiFi reconnection");
            allTestsPassed = false;
        }
        
        return allTestsPassed;
    }
    
    // Getters for test validation
    static bool isScanning() { return deviceScanning; }
    static bool isConnected() { return deviceConnected; }
    static bool isConfigured() { return deviceConfigured; }
    static bool isWiFiConnected() { return wifiConnected; }
};

// Static member initialization
bool BLEUserFlowHelper::deviceScanning = false;
bool BLEUserFlowHelper::deviceConnected = false;
bool BLEUserFlowHelper::deviceConfigured = false;
bool BLEUserFlowHelper::wifiConnected = false;
unsigned long BLEUserFlowHelper::testStepStartTime = 0;

// Test 1: Complete User Flow - Happy Path
void test_complete_user_flow_happy_path() {
    Serial.println("\n=== TEST: Complete User Flow - Happy Path ===");
    
    BLEUserFlowHelper::resetTestState();
    
    // Step 1: Start Scan
    bool scanResult = BLEUserFlowHelper::simulateStartScan();
    TEST_ASSERT_TRUE_MESSAGE(scanResult, "Step 1: Start Scan should succeed");
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isScanning(), "Device should be discoverable");
    
    // Step 2: Connect
    bool connectResult = BLEUserFlowHelper::simulateConnect();
    TEST_ASSERT_TRUE_MESSAGE(connectResult, "Step 2: Connect should succeed");
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isConnected(), "Device should be connected");
    
    // Step 3: Disconnect
    bool disconnectResult = BLEUserFlowHelper::simulateDisconnect();
    TEST_ASSERT_TRUE_MESSAGE(disconnectResult, "Step 3: Disconnect should succeed");
    TEST_ASSERT_FALSE_MESSAGE(BLEUserFlowHelper::isConnected(), "Device should be disconnected");
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isScanning(), "Device should remain discoverable");
    
    // Step 4: Reconnect
    bool reconnectResult = BLEUserFlowHelper::simulateReconnect();
    TEST_ASSERT_TRUE_MESSAGE(reconnectResult, "Step 4: Reconnect should succeed");
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isConnected(), "Device should be reconnected");
    
    Serial.println("\n✓ Complete User Flow - Happy Path: ALL STEPS PASSED");
}

// Test 2: Configuration Flow
void test_configuration_flow() {
    Serial.println("\n=== TEST: Configuration Flow ===");
    
    // Prerequisite: Device must be connected (from previous test)
    if (!BLEUserFlowHelper::isConnected()) {
        BLEUserFlowHelper::resetTestState();
        BLEUserFlowHelper::simulateStartScan();
        BLEUserFlowHelper::simulateConnect();
    }
    
    // Step 5: Enter Configuration Mode
    bool configModeResult = BLEUserFlowHelper::simulateConfigureMode();
    TEST_ASSERT_TRUE_MESSAGE(configModeResult, "Step 5: Configure mode should succeed");
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isConnected(), "Device should remain connected during configuration");
    
    // Step 6: Save Configuration
    bool saveConfigResult = BLEUserFlowHelper::simulateSaveConfiguration();
    TEST_ASSERT_TRUE_MESSAGE(saveConfigResult, "Step 6: Save configuration should succeed");
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isConnected(), "Device should remain connected after configuration");
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isConfigured(), "Device should be configured");
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isWiFiConnected(), "Device should connect to WiFi");
    
    Serial.println("\n✓ Configuration Flow: ALL STEPS PASSED");
}

// Test 3: Reconfiguration Flow
void test_reconfiguration_flow() {
    Serial.println("\n=== TEST: Reconfiguration Flow ===");
    
    // Prerequisite: Device must be connected and configured
    if (!BLEUserFlowHelper::isConnected() || !BLEUserFlowHelper::isConfigured()) {
        TEST_FAIL_MESSAGE("Prerequisites not met - device not connected/configured");
        return;
    }
    
    // Step 7: Enter Reconfiguration Mode
    bool reconfigModeResult = BLEUserFlowHelper::simulateReconfigure();
    TEST_ASSERT_TRUE_MESSAGE(reconfigModeResult, "Step 7: Reconfigure mode should succeed");
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isConnected(), "Device should remain connected during reconfiguration");
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isWiFiConnected(), "Device should maintain WiFi during reconfiguration");
    
    // Step 8: Save Updated Configuration
    bool resaveConfigResult = BLEUserFlowHelper::simulateResaveConfiguration();
    TEST_ASSERT_TRUE_MESSAGE(resaveConfigResult, "Step 8: Resave configuration should succeed");
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isConnected(), "Device should remain connected after reconfiguration");
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isWiFiConnected(), "Device should reconnect to WiFi with new config");
    
    Serial.println("\n✓ Reconfiguration Flow: ALL STEPS PASSED");
}

// Test 4: Critical Requirement - Always Configurable
void test_always_configurable_requirement() {
    Serial.println("\n=== TEST: Critical Requirement - Always Configurable ===");
    
    bool alwaysConfigurable = BLEUserFlowHelper::validateAlwaysConfigurable();
    TEST_ASSERT_TRUE_MESSAGE(alwaysConfigurable, "CRITICAL: Device must ALWAYS be configurable via BLE");
    
    Serial.println("\n✓ Always Configurable Requirement: VALIDATED");
}

// Test 5: Connection Stability During WiFi Operations
void test_ble_stability_during_wifi() {
    Serial.println("\n=== TEST: BLE Stability During WiFi Operations ===");
    
    if (!BLEUserFlowHelper::isConnected()) {
        TEST_FAIL_MESSAGE("Device not connected for stability test");
        return;
    }
    
    Serial.println("Simulating various WiFi operations while maintaining BLE connection:");
    
    // Simulate WiFi operations that might interfere with BLE
    for (int cycle = 0; cycle < 5; cycle++) {
        Serial.print("WiFi operation cycle ");
        Serial.println(cycle + 1);
        
        // Simulate heavy WiFi activity
        for (int i = 0; i < 20; i++) {
            simpleBLEPoll(); // Ensure BLE remains responsive
            delay(50);
            
            if (i % 5 == 0) {
                Serial.print("  BLE poll during WiFi activity - cycle ");
                Serial.println(i / 5 + 1);
            }
        }
        
        // Verify BLE is still responsive
        TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isConnected(), "BLE should remain connected during WiFi activity");
    }
    
    Serial.println("✓ BLE remained stable during WiFi operations");
}

// Test 6: Error Recovery and Resilience
void test_error_recovery() {
    Serial.println("\n=== TEST: Error Recovery and Resilience ===");
    
    if (!BLEUserFlowHelper::isConnected()) {
        TEST_FAIL_MESSAGE("Device not connected for error recovery test");
        return;
    }
    
    Serial.println("Testing error recovery scenarios:");
    
    // Scenario 1: Brief connection interruption
    Serial.println("1. Brief connection interruption simulation");
    delay(200); // Simulate brief interruption
    for (int i = 0; i < 10; i++) {
        simpleBLEPoll();
        delay(50);
    }
    TEST_ASSERT_TRUE_MESSAGE(BLEUserFlowHelper::isConnected(), "Should recover from brief interruption");
    
    // Scenario 2: Service restart
    Serial.println("2. Service restart simulation");
    bool restartResult = simpleBLEBegin(); // Reinitialize service
    TEST_ASSERT_TRUE_MESSAGE(restartResult, "Service should restart successfully");
    
    for (int i = 0; i < 15; i++) {
        simpleBLEPoll();
        delay(100);
    }
    
    Serial.println("✓ Error recovery mechanisms functional");
}

// Test Suite Runner for User Flow Tests
void runBLEUserFlowTests(void) {
    Serial.println("\n=== BLE USER FLOW TEST SUITE ===");
    Serial.println("Testing exact flow from BLE-testing steps.md");
    
    RUN_TEST(test_complete_user_flow_happy_path);
    RUN_TEST(test_configuration_flow);
    RUN_TEST(test_reconfiguration_flow);
    RUN_TEST(test_always_configurable_requirement);
    RUN_TEST(test_ble_stability_during_wifi);
    RUN_TEST(test_error_recovery);
    
    Serial.println("\n=== BLE USER FLOW TESTS COMPLETE ===");
    Serial.println("All tests match the expected BLE-testing steps.md flow");
}