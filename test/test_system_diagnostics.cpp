#include <unity.h>
#include <Arduino.h>
#include "SystemDiagnostics.h"

// Test fixtures
SystemDiagnostics* diagnostics;

void setUp(void) {
    diagnostics = new SystemDiagnostics();
}

void tearDown(void) {
    delete diagnostics;
}

// Basic Initialization Tests
void test_system_diagnostics_initialization(void) {
    TEST_ASSERT_NOT_NULL_MESSAGE(diagnostics, "SystemDiagnostics should initialize");
    TEST_ASSERT_TRUE_MESSAGE(diagnostics->isSystemHealthy(), "Fresh system should be healthy");
}

void test_system_status_reporting(void) {
    String status = diagnostics->getSystemStatus();
    TEST_ASSERT_EQUAL_STRING_MESSAGE("healthy", status.c_str(), "Fresh system should report healthy status");
}

// Performance Monitoring Tests
void test_loop_time_recording(void) {
    // Record some loop times
    diagnostics->recordLoopTime(10); // 10ms
    diagnostics->recordLoopTime(15); // 15ms
    diagnostics->recordLoopTime(20); // 20ms
    diagnostics->recordLoopTime(25); // 25ms
    
    unsigned long avgTime = diagnostics->getAverageLoopTime();
    TEST_ASSERT_GREATER_THAN_MESSAGE(0, avgTime, "Average loop time should be > 0");
    TEST_ASSERT_LESS_THAN_MESSAGE(100, avgTime, "Average loop time should be reasonable");
    
    unsigned long maxTime = diagnostics->getMaxLoopTime();
    TEST_ASSERT_EQUAL_MESSAGE(25, maxTime, "Max loop time should be 25ms");
}

// Network Monitoring Tests
void test_wifi_status_monitoring(void) {
    // Initially no WiFi recorded
    TEST_ASSERT_FALSE_MESSAGE(diagnostics->isWiFiStable(), "Initially WiFi should not be stable");
    
    // Record connected WiFi
    diagnostics->recordWiFiStatus(true, -50); // Connected with good signal
    TEST_ASSERT_TRUE_MESSAGE(diagnostics->isWiFiStable(), "WiFi should be stable when connected");
    TEST_ASSERT_EQUAL_INT_MESSAGE(-50, diagnostics->getWiFiRSSI(), "RSSI should be recorded");
    
    // Record disconnection
    diagnostics->recordWiFiStatus(false, 0);
    TEST_ASSERT_FALSE_MESSAGE(diagnostics->isWiFiStable(), "WiFi should not be stable when disconnected");
}

// BLE Monitoring Tests
void test_ble_activity_monitoring(void) {
    // Initially BLE should not be considered healthy (no activity)
    TEST_ASSERT_FALSE_MESSAGE(diagnostics->isBLEHealthy(), "Initially BLE should not be healthy");
    
    // Record BLE activity
    diagnostics->recordBLEActivity(true, 1); // Active with 1 connection
    TEST_ASSERT_TRUE_MESSAGE(diagnostics->isBLEHealthy(), "BLE should be healthy when active");
    
    unsigned long lastActivity = diagnostics->getLastBLEActivity();
    TEST_ASSERT_GREATER_THAN_MESSAGE(0, lastActivity, "Should record BLE activity time");
}

// API Monitoring Tests
void test_api_operation_tracking(void) {
    // Initially should be healthy (optimistic start)
    TEST_ASSERT_TRUE_MESSAGE(diagnostics->isTogglAPIHealthy(), "API should start healthy");
    
    // Record successful operations
    diagnostics->recordTimerOperation(true, "start_timer");
    diagnostics->recordTimerOperation(true, "stop_timer");
    TEST_ASSERT_TRUE_MESSAGE(diagnostics->isTogglAPIHealthy(), "API should be healthy with successful operations");
    
    int successRate = diagnostics->getAPISuccessRate();
    TEST_ASSERT_GREATER_OR_EQUAL_MESSAGE(80, successRate, "Success rate should be high with successful operations");
}

// Storage Monitoring Tests
void test_storage_health_monitoring(void) {
    // Initially should be healthy
    TEST_ASSERT_TRUE_MESSAGE(diagnostics->isStorageHealthy(), "Storage should start healthy");
    
    // Record successful operation
    diagnostics->recordStorageOperation(true, "save_config");
    TEST_ASSERT_TRUE_MESSAGE(diagnostics->isStorageHealthy(), "Storage should remain healthy with successful operations");
    
    // Record failure
    diagnostics->recordStorageOperation(false, "save_failed");
    TEST_ASSERT_FALSE_MESSAGE(diagnostics->isStorageHealthy(), "Storage should become unhealthy after failure");
    
    unsigned long lastError = diagnostics->getLastStorageError();
    TEST_ASSERT_GREATER_THAN_MESSAGE(0, lastError, "Should track last storage error time");
}

// System Health Integration Tests
void test_overall_system_health(void) {
    diagnostics->updateSystemMetrics();
    
    // With all subsystems healthy, overall should be healthy
    diagnostics->recordWiFiStatus(true, -50);
    diagnostics->recordBLEActivity(true, 1);
    diagnostics->recordTimerOperation(true, "test_op");
    diagnostics->recordStorageOperation(true, "test_save");
    
    diagnostics->updateSystemMetrics();
    TEST_ASSERT_TRUE_MESSAGE(diagnostics->isSystemHealthy(), "System should be healthy with all subsystems healthy");
    
    String status = diagnostics->getSystemStatus();
    TEST_ASSERT_EQUAL_STRING_MESSAGE("healthy", status.c_str(), "Status should report healthy");
}

// Test suite runner
void runSystemDiagnosticsTests(void) {
    RUN_TEST(test_system_diagnostics_initialization);
    RUN_TEST(test_system_status_reporting);
    RUN_TEST(test_loop_time_recording);
    RUN_TEST(test_wifi_status_monitoring);
    RUN_TEST(test_ble_activity_monitoring);
    RUN_TEST(test_api_operation_tracking);
    RUN_TEST(test_storage_health_monitoring);
    RUN_TEST(test_overall_system_health);
}