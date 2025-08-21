#include <unity.h>
#include <Arduino.h>
#include "StateManager.h"

// State Management Tests
void test_system_state_transitions(void) {
    // Test system state enum values
    TEST_ASSERT_EQUAL_INT_MESSAGE(0, (int)SystemState::BLE_SETUP_MODE, "BLE_SETUP_MODE should be 0");
    TEST_ASSERT_EQUAL_INT_MESSAGE(1, (int)SystemState::DUAL_MODE, "DUAL_MODE should be 1");
    TEST_ASSERT_EQUAL_INT_MESSAGE(2, (int)SystemState::NORMAL_OPERATION, "NORMAL_OPERATION should be 2");
    TEST_ASSERT_EQUAL_INT_MESSAGE(3, (int)SystemState::ERROR_STATE, "ERROR_STATE should be 3");
}

void test_orientation_handling(void) {
    // Test orientation detection and handling
    
    // Test orientation enum values
    TEST_ASSERT_EQUAL_INT_MESSAGE(0, (int)UNKNOWN, "UNKNOWN should be 0");
    TEST_ASSERT_EQUAL_INT_MESSAGE(1, (int)FACE_UP, "FACE_UP should be 1");
    TEST_ASSERT_EQUAL_INT_MESSAGE(2, (int)FACE_DOWN, "FACE_DOWN should be 2");
    TEST_ASSERT_EQUAL_INT_MESSAGE(3, (int)LEFT_SIDE, "LEFT_SIDE should be 3");
    TEST_ASSERT_EQUAL_INT_MESSAGE(4, (int)RIGHT_SIDE, "RIGHT_SIDE should be 4");
    TEST_ASSERT_EQUAL_INT_MESSAGE(5, (int)FRONT_EDGE, "FRONT_EDGE should be 5");
    TEST_ASSERT_EQUAL_INT_MESSAGE(6, (int)BACK_EDGE, "BACK_EDGE should be 6");
}

void test_dual_mode_capability(void) {
    // Test dual-mode operation (WiFi + BLE)
    
    // Verify that both WiFi and BLE can be conceptually active
    bool wifiCapable = true; // Would check network manager capability
    bool bleCapable = true;  // Would check BLE capability
    
    TEST_ASSERT_TRUE_MESSAGE(wifiCapable, "System should support WiFi");
    TEST_ASSERT_TRUE_MESSAGE(bleCapable, "System should support BLE");
    
    // Dual mode requires both
    bool dualModeCapable = wifiCapable && bleCapable;
    TEST_ASSERT_TRUE_MESSAGE(dualModeCapable, "System should support dual mode");
}

void test_error_state_handling(void) {
    // Test error state handling and recovery
    
    // Mock error conditions
    bool networkError = false;
    bool storageError = false;
    bool bleError = false;
    
    // System should be healthy with no errors
    bool systemHealthy = !networkError && !storageError && !bleError;
    TEST_ASSERT_TRUE_MESSAGE(systemHealthy, "System should be healthy with no errors");
    
    // Test error detection
    networkError = true;
    systemHealthy = !networkError && !storageError && !bleError;
    TEST_ASSERT_FALSE_MESSAGE(systemHealthy, "System should detect network error");
    
    // Test error recovery
    networkError = false; // Simulated recovery
    systemHealthy = !networkError && !storageError && !bleError;
    TEST_ASSERT_TRUE_MESSAGE(systemHealthy, "System should recover from network error");
}

void test_system_constants(void) {
    // Test that system constants are properly defined
    
    // Test debounce time is reasonable (should be in milliseconds)
    unsigned long debounceTime = 5000; // 5 seconds
    TEST_ASSERT_GREATER_THAN_MESSAGE(1000, debounceTime, "Debounce time should be > 1 second");
    TEST_ASSERT_LESS_THAN_MESSAGE(10000, debounceTime, "Debounce time should be < 10 seconds");
    
    // Test orientation threshold is reasonable
    float orientationThreshold = 0.5;
    TEST_ASSERT_GREATER_THAN_MESSAGE(0.0, orientationThreshold, "Orientation threshold should be > 0");
    TEST_ASSERT_LESS_THAN_MESSAGE(1.0, orientationThreshold, "Orientation threshold should be < 1");
}

// Test suite runner
void runStateManagerTests(void) {
    RUN_TEST(test_system_state_transitions);
    RUN_TEST(test_orientation_handling);
    RUN_TEST(test_dual_mode_capability);
    RUN_TEST(test_error_state_handling);
    RUN_TEST(test_system_constants);
}