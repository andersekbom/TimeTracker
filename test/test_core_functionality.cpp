#include <Arduino.h>
#include <unity.h>
#include <WiFiNINA.h>
#include <Arduino_LSM6DSOX.h>
#include "Config.h"
#include "LEDController.h"
#include "OrientationDetector.h"
#include "TogglAPI.h"

// Test configuration - using hardcoded values to avoid BLE dependencies
#define TEST_WIFI_SSID "eichbaum"
#define TEST_WIFI_PASSWORD "zooweedoobee"  
#define TEST_TOGGL_API_TOKEN "8512ae2df80f50ecaa5a7e0c4c96cc57"
#define TEST_WORKSPACE_ID "20181448"
#define TEST_PROJECT_FACE_DOWN 212267804
#define TEST_PROJECT_LEFT_SIDE 212267805
#define TEST_PROJECT_RIGHT_SIDE 212267806
#define TEST_PROJECT_FRONT_EDGE 212267807
#define TEST_PROJECT_BACK_EDGE 212267809

// Global test objects
LEDController* testLedController = nullptr;
OrientationDetector* testOrientationDetector = nullptr;
WiFiSSLClient* testSslClient = nullptr;
HttpClient* testHttpClient = nullptr;
TogglAPI* testTogglAPI = nullptr;

// Test results tracking
struct TestResults {
    bool imuInitialized = false;
    bool wifiConnected = false;
    bool togglApiConfigured = false;
    bool orientationDetectionWorking = false;
    bool togglCommunicationWorking = false;
    int orientationChangesDetected = 0;
    int togglApiCallsSuccessful = 0;
    int togglApiCallsFailed = 0;
    String lastError = "";
};

TestResults results;

void setUp(void) {
    Serial.println("\n=== Core Functionality Test Setup ===");
    
    // Initialize LED controller
    testLedController = new LEDController();
    if (testLedController->begin()) {
        Serial.println("✓ LED Controller initialized");
        testLedController->setColor(0, 0, 255); // Blue for testing
    } else {
        Serial.println("✗ LED Controller failed");
    }
    
    // Initialize IMU
    if (IMU.begin()) {
        Serial.println("✓ IMU initialized");
        results.imuInitialized = true;
    } else {
        Serial.println("✗ IMU initialization failed");
        results.imuInitialized = false;
        results.lastError = "IMU initialization failed";
    }
    
    // Initialize orientation detector
    testOrientationDetector = new OrientationDetector(Config::ORIENTATION_THRESHOLD, Config::DEBOUNCE_TIME);
    Serial.println("✓ OrientationDetector created");
    
    // Initialize WiFi (critical for Toggl API)
    Serial.print("Connecting to WiFi: ");
    Serial.println(TEST_WIFI_SSID);
    testLedController->setColor(255, 255, 0); // Yellow during connection
    
    WiFi.begin(TEST_WIFI_SSID, TEST_WIFI_PASSWORD);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.print("✓ WiFi connected! IP: ");
        Serial.println(WiFi.localIP());
        results.wifiConnected = true;
        testLedController->setColor(0, 255, 0); // Green when connected
        delay(1000);
    } else {
        Serial.println();
        Serial.println("✗ WiFi connection failed");
        results.wifiConnected = false;
        results.lastError = "WiFi connection failed";
        testLedController->showError();
    }
    
    // Initialize Toggl API (only if WiFi is connected)
    if (results.wifiConnected) {
        testSslClient = new WiFiSSLClient();
        testHttpClient = new HttpClient(*testSslClient, Config::TOGGL_SERVER, Config::TOGGL_PORT);
        testTogglAPI = new TogglAPI(testHttpClient);
        
        // Configure Toggl API
        int projectIds[6] = {0, TEST_PROJECT_FACE_DOWN, TEST_PROJECT_LEFT_SIDE, 
                           TEST_PROJECT_RIGHT_SIDE, TEST_PROJECT_FRONT_EDGE, TEST_PROJECT_BACK_EDGE};
        testTogglAPI->setCredentials(TEST_TOGGL_API_TOKEN, TEST_WORKSPACE_ID);
        testTogglAPI->setProjectIds(projectIds);
        
        Serial.println("✓ Toggl API configured");
        results.togglApiConfigured = true;
    }
    
    // Turn off LED after setup
    testLedController->turnOff();
    
    Serial.println("=== Setup Complete ===\n");
}

void tearDown(void) {
    // Cleanup
    if (testTogglAPI) {
        testTogglAPI->stopCurrentTimeEntry(); // Clean stop any running timers
        delete testTogglAPI;
        testTogglAPI = nullptr;
    }
    if (testHttpClient) {
        delete testHttpClient;
        testHttpClient = nullptr;
    }
    if (testSslClient) {
        delete testSslClient;
        testSslClient = nullptr;
    }
    if (testOrientationDetector) {
        delete testOrientationDetector;
        testOrientationDetector = nullptr;
    }
    if (testLedController) {
        testLedController->turnOff();
        delete testLedController;
        testLedController = nullptr;
    }
}

void test_imu_initialization() {
    Serial.println("TEST: IMU Initialization");
    TEST_ASSERT_TRUE_MESSAGE(results.imuInitialized, "IMU should be initialized successfully");
    
    if (results.imuInitialized) {
        // Test if we can read acceleration data
        float x, y, z;
        bool dataAvailable = false;
        int attempts = 0;
        
        while (!dataAvailable && attempts < 10) {
            if (IMU.accelerationAvailable()) {
                IMU.readAcceleration(x, y, z);
                dataAvailable = true;
            }
            delay(100);
            attempts++;
        }
        
        TEST_ASSERT_TRUE_MESSAGE(dataAvailable, "Should be able to read acceleration data");
        
        if (dataAvailable) {
            Serial.print("Sample acceleration - X: ");
            Serial.print(x, 3);
            Serial.print(", Y: ");
            Serial.print(y, 3);
            Serial.print(", Z: ");
            Serial.println(z, 3);
            
            // Basic sanity check - total acceleration should be roughly 1g
            float totalAccel = sqrt(x*x + y*y + z*z);
            TEST_ASSERT_FLOAT_WITHIN_MESSAGE(0.5, 1.0, totalAccel, "Total acceleration should be approximately 1g");
        }
    }
}

void test_orientation_detection() {
    Serial.println("TEST: Orientation Detection");
    
    if (!results.imuInitialized) {
        TEST_IGNORE_MESSAGE("Skipping orientation test - IMU not initialized");
        return;
    }
    
    TEST_ASSERT_NOT_NULL_MESSAGE(testOrientationDetector, "OrientationDetector should be created");
    
    // Test multiple orientation readings
    int validReadings = 0;
    int totalReadings = 0;
    Orientation lastOrientation = UNKNOWN;
    
    Serial.println("Collecting orientation samples (10 seconds)...");
    unsigned long startTime = millis();
    
    while ((millis() - startTime) < 10000) { // 10 second test
        if (IMU.accelerationAvailable()) {
            float x, y, z;
            IMU.readAcceleration(x, y, z);
            
            Orientation currentOrientation = testOrientationDetector->detectOrientation(x, y, z);
            totalReadings++;
            
            if (currentOrientation != UNKNOWN) {
                validReadings++;
                
                // Check for orientation changes
                if (testOrientationDetector->hasOrientationChanged(currentOrientation)) {
                    results.orientationChangesDetected++;
                    
                    Serial.print("Orientation change detected: ");
                    Serial.print(testOrientationDetector->getOrientationName(currentOrientation));
                    Serial.print(" (X: ");
                    Serial.print(x, 2);
                    Serial.print(", Y: ");
                    Serial.print(y, 2);
                    Serial.print(", Z: ");
                    Serial.print(z, 2);
                    Serial.println(")");
                    
                    testOrientationDetector->updateOrientation(currentOrientation);
                    testLedController->updateColorForOrientation(currentOrientation, Config::LED_MAX_INTENSITY);
                    
                    lastOrientation = currentOrientation;
                }
            }
        }
        delay(100); // 100ms sampling rate
    }
    
    Serial.print("Valid readings: ");
    Serial.print(validReadings);
    Serial.print("/");
    Serial.println(totalReadings);
    
    TEST_ASSERT_TRUE_MESSAGE(validReadings > 0, "Should have at least some valid orientation readings");
    
    float validReadingPercentage = (float)validReadings / totalReadings * 100;
    TEST_ASSERT_TRUE_MESSAGE(validReadingPercentage > 70, "At least 70% of readings should be valid");
    
    results.orientationDetectionWorking = validReadingPercentage > 70;
    
    testLedController->turnOff(); // Turn off LED after test
}

void test_wifi_connectivity() {
    Serial.println("TEST: WiFi Connectivity");
    TEST_ASSERT_TRUE_MESSAGE(results.wifiConnected, "WiFi should be connected");
    
    if (results.wifiConnected) {
        // Test if we still have connectivity
        int status = WiFi.status();
        TEST_ASSERT_EQUAL_MESSAGE(WL_CONNECTED, status, "WiFi should remain connected");
        
        // Test IP address is valid
        IPAddress ip = WiFi.localIP();
        TEST_ASSERT_NOT_EQUAL_MESSAGE(IPAddress(0,0,0,0), ip, "Should have valid IP address");
        
        Serial.print("WiFi Status: ");
        Serial.println(status);
        Serial.print("IP Address: ");
        Serial.println(ip);
        Serial.print("RSSI: ");
        Serial.println(WiFi.RSSI());
    }
}

void test_toggl_api_basic_functionality() {
    Serial.println("TEST: Toggl API Basic Functionality");
    
    if (!results.wifiConnected) {
        TEST_IGNORE_MESSAGE("Skipping Toggl test - WiFi not connected");
        return;
    }
    
    if (!results.togglApiConfigured) {
        TEST_IGNORE_MESSAGE("Skipping Toggl test - API not configured");
        return;
    }
    
    TEST_ASSERT_NOT_NULL_MESSAGE(testTogglAPI, "TogglAPI should be created");
    
    // Test 1: Stop any existing time entries (cleanup)
    Serial.println("Stopping any existing time entries...");
    bool stopResult = testTogglAPI->stopCurrentTimeEntry();
    Serial.print("Stop result: ");
    Serial.println(stopResult ? "Success" : "Failed/None");
    
    delay(1000); // Wait between API calls
    
    // Test 2: Start a new time entry
    Serial.println("Starting test time entry...");
    bool startResult = testTogglAPI->startTimeEntry(FACE_DOWN, "TEST: Core Functionality Test");
    
    if (startResult) {
        results.togglApiCallsSuccessful++;
        Serial.println("✓ Time entry started successfully");
        
        String entryId = testTogglAPI->getCurrentEntryId();
        TEST_ASSERT_FALSE_MESSAGE(entryId.isEmpty(), "Should have valid entry ID");
        Serial.print("Entry ID: ");
        Serial.println(entryId);
        
        delay(3000); // Let it run for 3 seconds
        
        // Test 3: Stop the time entry
        Serial.println("Stopping test time entry...");
        bool stopResult2 = testTogglAPI->stopCurrentTimeEntry();
        
        if (stopResult2) {
            results.togglApiCallsSuccessful++;
            Serial.println("✓ Time entry stopped successfully");
        } else {
            results.togglApiCallsFailed++;
            Serial.println("✗ Failed to stop time entry");
        }
        
    } else {
        results.togglApiCallsFailed++;
        results.lastError = "Failed to start Toggl time entry";
        Serial.println("✗ Failed to start time entry");
    }
    
    results.togglCommunicationWorking = (results.togglApiCallsSuccessful > 0);
    
    TEST_ASSERT_TRUE_MESSAGE(results.togglCommunicationWorking, "At least one Toggl API call should succeed");
}

void test_integrated_workflow() {
    Serial.println("TEST: Integrated Workflow (Orientation -> Toggl)");
    
    if (!results.orientationDetectionWorking) {
        TEST_IGNORE_MESSAGE("Skipping integrated test - orientation detection not working");
        return;
    }
    
    if (!results.togglCommunicationWorking) {
        TEST_IGNORE_MESSAGE("Skipping integrated test - Toggl communication not working");
        return;
    }
    
    Serial.println("Testing full workflow for 15 seconds...");
    Serial.println("Please change device orientation to test integration...");
    
    String currentTimeEntryId = "";
    Orientation lastOrientation = UNKNOWN;
    int workflowSuccesses = 0;
    
    unsigned long startTime = millis();
    
    while ((millis() - startTime) < 15000) { // 15 second test
        if (IMU.accelerationAvailable()) {
            float x, y, z;
            IMU.readAcceleration(x, y, z);
            
            Orientation currentOrientation = testOrientationDetector->detectOrientation(x, y, z);
            
            if (testOrientationDetector->hasOrientationChanged(currentOrientation)) {
                Serial.println("\n--- Orientation Change Detected ---");
                
                // Stop current timer if running
                if (!currentTimeEntryId.isEmpty()) {
                    Serial.println("Stopping current timer...");
                    if (testTogglAPI->stopCurrentTimeEntry()) {
                        Serial.println("✓ Timer stopped successfully");
                        currentTimeEntryId = "";
                        workflowSuccesses++;
                    } else {
                        Serial.println("✗ Failed to stop timer");
                    }
                }
                
                // Update orientation
                testOrientationDetector->updateOrientation(currentOrientation);
                testLedController->updateColorForOrientation(currentOrientation, Config::LED_MAX_INTENSITY);
                
                // Print orientation info
                testOrientationDetector->printOrientation(currentOrientation, x, y, z);
                
                // Start new timer if not break time
                if (currentOrientation != UNKNOWN && currentOrientation != FACE_UP) {
                    String description = testOrientationDetector->getOrientationName(currentOrientation);
                    Serial.print("Starting timer for: ");
                    Serial.println(description);
                    
                    if (testTogglAPI->startTimeEntry(currentOrientation, description)) {
                        currentTimeEntryId = testTogglAPI->getCurrentEntryId();
                        Serial.print("✓ Timer started successfully! ID: ");
                        Serial.println(currentTimeEntryId);
                        workflowSuccesses++;
                    } else {
                        Serial.println("✗ Failed to start timer");
                    }
                } else if (currentOrientation == FACE_UP) {
                    Serial.println("Break time - no timer started");
                }
                
                Serial.println("--- End Orientation Change ---\n");
                lastOrientation = currentOrientation;
            }
        }
        delay(100);
    }
    
    // Clean up - stop any running timer
    if (!currentTimeEntryId.isEmpty()) {
        testTogglAPI->stopCurrentTimeEntry();
    }
    
    testLedController->turnOff();
    
    Serial.print("Workflow successes: ");
    Serial.println(workflowSuccesses);
    
    TEST_ASSERT_TRUE_MESSAGE(workflowSuccesses > 0, "Should have at least one successful workflow operation");
}

void test_system_stability() {
    Serial.println("TEST: System Stability");
    
    Serial.println("Checking system stability metrics...");
    
    // Check memory usage (rough estimate)
    Serial.print("Free RAM (estimated): ");
    Serial.println(freeRam());
    
    // Verify all components are still responsive
    bool systemStable = true;
    
    // Test LED controller
    if (testLedController) {
        testLedController->setColor(255, 0, 255); // Magenta
        delay(500);
        testLedController->turnOff();
    } else {
        systemStable = false;
    }
    
    // Test WiFi
    if (WiFi.status() != WL_CONNECTED) {
        systemStable = false;
    }
    
    // Test IMU
    if (results.imuInitialized && IMU.accelerationAvailable()) {
        float x, y, z;
        IMU.readAcceleration(x, y, z);
        // If we get here, IMU is still responsive
    } else if (results.imuInitialized) {
        systemStable = false;
    }
    
    TEST_ASSERT_TRUE_MESSAGE(systemStable, "System should remain stable throughout testing");
    
    // Print final results summary
    Serial.println("\n=== FINAL TEST RESULTS ===");
    Serial.print("IMU Initialized: ");
    Serial.println(results.imuInitialized ? "✓" : "✗");
    Serial.print("WiFi Connected: ");
    Serial.println(results.wifiConnected ? "✓" : "✗");
    Serial.print("Toggl API Configured: ");
    Serial.println(results.togglApiConfigured ? "✓" : "✗");
    Serial.print("Orientation Detection Working: ");
    Serial.println(results.orientationDetectionWorking ? "✓" : "✗");
    Serial.print("Toggl Communication Working: ");
    Serial.println(results.togglCommunicationWorking ? "✓" : "✗");
    Serial.print("Orientation Changes Detected: ");
    Serial.println(results.orientationChangesDetected);
    Serial.print("Toggl API Calls Successful: ");
    Serial.println(results.togglApiCallsSuccessful);
    Serial.print("Toggl API Calls Failed: ");
    Serial.println(results.togglApiCallsFailed);
    
    if (!results.lastError.isEmpty()) {
        Serial.print("Last Error: ");
        Serial.println(results.lastError);
    }
    Serial.println("========================\n");
}

// Utility function to estimate free RAM (simplified for Arduino)
int freeRam() {
    // Simple stack pointer check for Arduino
    extern int __heap_start, *__brkval; 
    int v; 
    return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval); 
}

void setup() {
    Serial.begin(9600);
    // No waiting for serial connection to allow standalone operation
    
    UNITY_BEGIN();
    
    RUN_TEST(test_imu_initialization);
    RUN_TEST(test_wifi_connectivity);
    RUN_TEST(test_orientation_detection);
    RUN_TEST(test_toggl_api_basic_functionality);
    RUN_TEST(test_integrated_workflow);
    RUN_TEST(test_system_stability);
    
    UNITY_END();
}

void loop() {
    // Test complete - just blink LED to show we're alive
    if (testLedController) {
        testLedController->setColor(0, 255, 0); // Green
        delay(1000);
        testLedController->turnOff();
        delay(1000);
    } else {
        delay(2000);
    }
}
