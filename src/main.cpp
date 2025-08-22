#include <Arduino.h>
#include <ArduinoHttpClient.h>
#include <ArduinoBLE.h>

// Platform-specific includes
#if defined(ARDUINO_ARCH_SAMD) || defined(ARDUINO_NANO33BLE)
  #include <WiFiNINA.h>
  #include <WiFiSSLClient.h>
  #include <Arduino_LSM6DSOX.h>
#elif defined(ARDUINO_ARCH_ESP32)
  #include <WiFi.h>
  #include <WiFiClientSecure.h>
  #include <LSM6DS3.h>
#else
  #include <WiFiNINA.h>
  #include <WiFiSSLClient.h>30000
  #include <Arduino_LSM6DSOX.h>
#endif

// Project modules
#include "Config.h"
#include "LEDController.h"
#include "OrientationDetector.h"
#include "TogglAPI.h"

// HARDCODED CONFIGURATION - FROM TimeTrackerConfigApp/src/constants/config.ts
#define WIFI_SSID "eichbaum"
#define WIFI_PASSWORD "zooweedoobee"  
#define TOGGL_API_TOKEN "8512ae2df80f50ecaa5a7e0c4c96cc57"
#define WORKSPACE_ID "20181448"
// Project IDs for orientations: face_up, face_down, left_side, right_side, front_edge, back_edge
#define PROJECT_FACE_UP 0
#define PROJECT_FACE_DOWN 212267804
#define PROJECT_LEFT_SIDE 212267805  
#define PROJECT_RIGHT_SIDE 212267806
#define PROJECT_FRONT_EDGE 212267807
#define PROJECT_BACK_EDGE 212267809

// BLE Configuration Service handled by SimpleBLEConfig.cpp

// Configuration variables (will be populated via BLE)
String configWifiSSID = "";
String configWifiPassword = "";
String configTogglToken = "";
String configWorkspaceId = "";
int configProjectIds[6] = {0, 0, 0, 0, 0, 0};

// Global objects
LEDController ledController;
OrientationDetector orientationDetector(Config::ORIENTATION_THRESHOLD, Config::DEBOUNCE_TIME);

// Network client
WiFiSSLClient sslClient;
HttpClient httpClient(sslClient, Config::TOGGL_SERVER, Config::TOGGL_PORT);
TogglAPI togglAPI(&httpClient);

// Function declarations
void handleOrientationChange(Orientation newOrientation, float accelX, float accelY, float accelZ);

// SimpleBLEConfig functions (from SimpleBLEConfig.cpp)
bool simpleBLEBegin();
void simpleBLEPoll();
bool isConfigComplete();
String getWifiSSID();
String getWifiPassword();
String getTogglToken();
String getWorkspaceId();
int* getProjectIds();

void setup() {
    // Initialize serial communication
    Serial.begin(9600);
    while (!Serial && millis() < 5000) { delay(100); } // Wait up to 5 seconds for serial
    
    Serial.println("TimeTracker with BLE Configuration");
    Serial.println("Initializing components...");
    
    // Initialize LED
    if (ledController.begin()) {
        Serial.println("LED controller initialized");
        ledController.setColor(0, 0, 255); // Blue during BLE setup
    } else {
        Serial.println("LED controller failed");
    }
    
    // Initialize IMU
    if (IMU.begin()) {
        Serial.println("IMU initialized successfully");
    } else {
        Serial.println("IMU initialization failed!");
        ledController.showError();
        while(1) delay(1000); // Stop here if IMU fails
    }
    
    // Wait for BLE configuration - no timeout, keep advertising until configured
    Serial.println("Starting BLE configuration mode...");
    Serial.println("Waiting for configuration from mobile app...");
    
    if (simpleBLEBegin()) {
        Serial.println("BLE started successfully - advertising until configured");
        
        // Wait indefinitely for configuration
        while (!isConfigComplete()) {
            simpleBLEPoll();
            delay(100);
            
            // Show we're still waiting every 10 seconds
            static unsigned long lastStatusPrint = 0;
            if (millis() - lastStatusPrint > 10000) {
                Serial.println("Waiting for BLE configuration...");
                lastStatusPrint = millis();
            }
        }
        
        Serial.println("BLE configuration received!");
        // Update configuration variables
        configWifiSSID = getWifiSSID();
        configWifiPassword = getWifiPassword();
        configTogglToken = getTogglToken();
        configWorkspaceId = getWorkspaceId();
        
        // Get project IDs
        int* receivedProjectIds = getProjectIds();
        if (receivedProjectIds) {
            for (int i = 0; i < 6; i++) {
                configProjectIds[i] = receivedProjectIds[i];
            }
        }
        
        // Stop BLE completely after successful configuration
        BLE.end();
        Serial.println("BLE disabled - switching to WiFi mode");
    } else {
        Serial.println("BLE start failed - cannot continue without configuration!");
        ledController.showError();
        while(1) delay(1000); // Stop here if BLE fails
    }

    // Initialize WiFi connection with received config
    Serial.print("Connecting to WiFi: ");
    Serial.println(configWifiSSID);
    ledController.setColor(255, 255, 0); // Yellow during WiFi connection
    
    WiFi.begin(configWifiSSID.c_str(), configWifiPassword.c_str());
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.print("WiFi connected! IP: ");
        Serial.println(WiFi.localIP());
        ledController.setColor(0, 255, 0); // Green when connected
        delay(1000);
    } else {
        Serial.println();
        Serial.println("WiFi connection failed!");
        ledController.showError();
        while(1) delay(1000); // Stop here if WiFi fails
        // TODO: Should re-enable BLE for new configuration attempt
    }
    
    // Configure Toggl API with received values
    togglAPI.setCredentials(configTogglToken, configWorkspaceId);
    togglAPI.setProjectIds(configProjectIds);
    
    Serial.println("Configuration complete!");
    Serial.println("WiFi: " + configWifiSSID);
    Serial.println("Workspace: " + configWorkspaceId);
    Serial.println("Token: " + configTogglToken.substring(0,8) + "...");
    
    Serial.println("TimeTracker ready for time tracking!");
    ledController.turnOff(); // Turn off LED, ready for orientation detection
}

// Global state for tracking
String currentTimeEntryId = "";
Orientation lastOrientation = UNKNOWN;

void loop() {
    // Simple orientation detection and time tracking loop
    
    // Read IMU data
    float accelX, accelY, accelZ;
    if (IMU.accelerationAvailable()) {
        IMU.readAcceleration(accelX, accelY, accelZ);
        
        // Detect current orientation
        Orientation currentOrientation = orientationDetector.detectOrientation(accelX, accelY, accelZ);
        
        // Check if orientation changed (with debouncing)
        if (orientationDetector.hasOrientationChanged(currentOrientation)) {
            handleOrientationChange(currentOrientation, accelX, accelY, accelZ);
            lastOrientation = currentOrientation;
        }
    }
    
    // Small delay for stability
    delay(Config::MAIN_LOOP_DELAY);
}

void handleOrientationChange(Orientation newOrientation, float accelX, float accelY, float accelZ) {
    Serial.println("\n--- Orientation Change ---");
    
    // Stop current timer if running  
    if (currentTimeEntryId != "") {
        Serial.println("Stopping current timer...");
        if (togglAPI.stopCurrentTimeEntry()) {
            Serial.println("Timer stopped successfully");
            currentTimeEntryId = "";
        } else {
            Serial.println("Failed to stop timer");
        }
    }
    
    // Update orientation in detector
    orientationDetector.updateOrientation(newOrientation);
    
    // Update LED for new orientation
    ledController.updateColorForOrientation(newOrientation, Config::LED_MAX_INTENSITY);
    
    // Print orientation info
    orientationDetector.printOrientation(newOrientation, accelX, accelY, accelZ);
    
    // Start new timer if not timer stopped
    if (newOrientation != UNKNOWN && newOrientation != FACE_UP) {
        String description = orientationDetector.getOrientationName(newOrientation);
        Serial.print("Starting timer for: ");
        Serial.println(description);
        
        if (togglAPI.startTimeEntry(newOrientation, description)) {
            currentTimeEntryId = togglAPI.getCurrentEntryId();
            Serial.print("Timer started successfully! ID: ");
            Serial.println(currentTimeEntryId);
        } else {
            Serial.println("Failed to start timer");
        }
    } else if (newOrientation == FACE_UP) {
        Serial.println("No timer started");
    }
    
    Serial.println("--- End Orientation Change ---\n");
}

// BLE Configuration Functions
// Old BLE functions removed - now using SimpleBLEConfig.cpp