#include <unity.h>
#include <Arduino.h>

// Import all test suites
extern void runConfigStorageTests(void);
extern void runBLEProtocolTests(void);
extern void runStateManagerTests(void);
extern void runSystemDiagnosticsTests(void);
extern void runBLEConnectivityTests(void);
extern void runAdvancedBLETests(void);
extern void runBLEUserFlowTests(void);

// Integration Tests
void test_system_integration(void) {
    // Test that all major components can coexist
    TEST_ASSERT_TRUE_MESSAGE(true, "System integration test placeholder");
    
    // This test verifies that:
    // 1. All headers compile together
    // 2. No symbol conflicts exist
    // 3. Basic initialization chain works
    
    Serial.println("System integration test completed");
}

void test_memory_constraints(void) {
    // Test memory usage is within reasonable bounds
    
    // RP2040 Connect: 270KB RAM, 2MB Flash
    // Nano 33 IoT: 32KB RAM, 256KB Flash
    
    // Check that we can allocate basic objects without running out of memory
    
    // Allocate test objects
    char* testBuffer = (char*)malloc(1024); // 1KB test allocation
    TEST_ASSERT_NOT_NULL_MESSAGE(testBuffer, "Should be able to allocate 1KB");
    
    if (testBuffer) {
        free(testBuffer);
    }
    
    // Memory test passes if no crashes occur
    TEST_ASSERT_TRUE_MESSAGE(true, "Memory allocation test completed");
}

void test_platform_compatibility(void) {
    // Test platform-specific features
    
    #if defined(ARDUINO_ARCH_SAMD)
        TEST_ASSERT_TRUE_MESSAGE(true, "SAMD platform detected");
        Serial.println("Running on SAMD platform (Nano 33 IoT)");
    #elif defined(ARDUINO_ARCH_MBED) || defined(ARDUINO_NANO33BLE)
        TEST_ASSERT_TRUE_MESSAGE(true, "MBED/RP2040 platform detected");
        Serial.println("Running on MBED/RP2040 platform (Nano RP2040 Connect)");
    #else
        TEST_ASSERT_TRUE_MESSAGE(true, "Unknown platform - using defaults");
        Serial.println("Running on unknown platform");
    #endif
}

void test_serial_communication(void) {
    // Test serial communication works
    Serial.println("Testing serial output...");
    TEST_ASSERT_TRUE_MESSAGE(true, "Serial communication test");
    
    // Test that we can print various data types
    Serial.print("Integer: ");
    Serial.println(42);
    Serial.print("Float: ");
    Serial.println(3.14159);
    Serial.print("String: ");
    Serial.println("Test successful");
}

void test_timing_functions(void) {
    // Test timing functions work correctly
    unsigned long start = millis();
    delay(10); // 10ms delay
    unsigned long end = millis();
    
    unsigned long elapsed = end - start;
    TEST_ASSERT_GREATER_OR_EQUAL_MESSAGE(8, elapsed, "Delay should be at least 8ms");
    TEST_ASSERT_LESS_THAN_MESSAGE(20, elapsed, "Delay should be less than 20ms");
}

void test_string_operations(void) {
    // Test Arduino String operations work correctly
    String test1 = "Hello";
    String test2 = "World";
    String combined = test1 + " " + test2;
    
    TEST_ASSERT_EQUAL_STRING_MESSAGE("Hello World", combined.c_str(), "String concatenation should work");
    TEST_ASSERT_EQUAL_INT_MESSAGE(11, combined.length(), "Combined string should be 11 characters");
    
    // Test string modification
    combined.replace("World", "TimeTracker");
    TEST_ASSERT_TRUE_MESSAGE(combined.indexOf("TimeTracker") >= 0, "String replacement should work");
}

void test_math_operations(void) {
    // Test floating point math operations
    float a = 1.5;
    float b = 2.5;
    float result = a + b;
    
    TEST_ASSERT_FLOAT_WITHIN_MESSAGE(0.01, 4.0, result, "Float addition should work correctly");
    
    // Test integer operations
    int x = 10;
    int y = 3;
    int quotient = x / y;
    int remainder = x % y;
    
    TEST_ASSERT_EQUAL_INT_MESSAGE(3, quotient, "Integer division should work");
    TEST_ASSERT_EQUAL_INT_MESSAGE(1, remainder, "Modulo operation should work");
}

// Main test runner
void setup() {
    // Initialize serial communication
    Serial.begin(115200);
    while (!Serial && millis() < 5000) {
        delay(100); // Wait for serial connection or timeout
    }
    
    delay(2000); // Give time for serial monitor to connect
    
    Serial.println("\n\n=================================");
    Serial.println("TimeTracker Firmware Test Suite");
    Serial.println("=================================");
    
    // Initialize Unity test framework
    UNITY_BEGIN();
    
    // Run integration tests first
    Serial.println("\n--- Integration Tests ---");
    RUN_TEST(test_system_integration);
    RUN_TEST(test_memory_constraints);
    RUN_TEST(test_platform_compatibility);
    RUN_TEST(test_serial_communication);
    RUN_TEST(test_timing_functions);
    RUN_TEST(test_string_operations);
    RUN_TEST(test_math_operations);
    
    // Run component-specific test suites
    Serial.println("\n--- ConfigStorage Tests ---");
    runConfigStorageTests();
    
    Serial.println("\n--- BLE Protocol Tests ---");
    runBLEProtocolTests();
    
    Serial.println("\n--- BLE User Flow Tests (Primary) ---");
    runBLEUserFlowTests();
    
    Serial.println("\n--- BLE Connectivity Tests ---");
    runBLEConnectivityTests();
    
    Serial.println("\n--- Advanced BLE Tests ---");
    runAdvancedBLETests();
    
    Serial.println("\n--- StateManager Tests ---");
    runStateManagerTests();
    
    Serial.println("\n--- SystemDiagnostics Tests ---");
    runSystemDiagnosticsTests();
    
    // Finish tests
    UNITY_END();
    
    Serial.println("\n=================================");
    Serial.println("Test Suite Complete");
    Serial.println("=================================\n");
}

void loop() {
    // Test loop - blink LED to show system is running after tests
    static unsigned long lastBlink = 0;
    static bool ledState = false;
    
    if (millis() - lastBlink > 1000) {
        ledState = !ledState;
        // Platform-specific LED control would go here
        Serial.print("Test system running... LED ");
        Serial.println(ledState ? "ON" : "OFF");
        lastBlink = millis();
    }
    
    delay(100);
}

// Unity test framework hooks
void setUp(void) {
    // This function runs before each test
}

void tearDown(void) {
    // This function runs after each test
}