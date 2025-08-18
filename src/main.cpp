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
  #include <WiFiSSLClient.h>
  #include <Arduino_LSM6DSOX.h>
#endif

// Project modules
#include "Config.h"
#include "Configuration.h"
#include "LEDController.h"
#include "NetworkManager.h"
#include "OrientationDetector.h"
#include "TogglAPI.h"
#include "ConfigStorage.h"

// BLE configuration functions (using working SimpleBLE approach)
extern bool simpleBLEBegin();
extern void simpleBLEPoll();
extern bool isConfigComplete();
extern String getWifiSSID();
extern String getWifiPassword();
extern String getTogglToken();
extern String getWorkspaceId();
extern const int* getProjectIds();

// Global objects
LEDController ledController;
NetworkManager networkManager;
OrientationDetector orientationDetector(Config::ORIENTATION_THRESHOLD, Config::DEBOUNCE_TIME);

// Network client
WiFiSSLClient sslClient;
HttpClient httpClient(sslClient, Config::TOGGL_SERVER, Config::TOGGL_PORT);
TogglAPI togglAPI(&httpClient);

// IMU data
float accelX, accelY, accelZ;

// Configuration and BLE state
ConfigStorage configStorage;
bool bleActive = false;
bool configApplied = false;

// Default project IDs for testing (can be made configurable later)
int defaultProjectIds[6] = {12345, 12346, 12347, 12348, 12349, 12350};

void setup() {
    Serial.begin(Config::SERIAL_BAUD);
    
    // Optional serial connection with timeout for standalone operation
    unsigned long serialTimeout = millis() + 3000; // 3 second timeout
    while (!Serial && millis() < serialTimeout) {
        delay(100);
    }
    
    if (Serial) {
        Serial.println("TimeTracker Cube Starting...");
    }
    
    // Initialize LED controller
    int ledRetries = 3;
    while (!ledController.begin() && ledRetries > 0) {
        ledRetries--;
        delay(1000);
    }
    if (ledRetries == 0) {
        if (Serial) Serial.println("Warning: LED controller failed to initialize");
    }
    
    // Initialize IMU
    int imuRetries = 5;
    while (!orientationDetector.begin() && imuRetries > 0) {
        imuRetries--;
        delay(2000);
    }
    if (imuRetries == 0) {
        if (Serial) Serial.println("Critical: IMU failed - basic operation only");
        ledController.showError(); // Brief error indication
        delay(2000);
    }
    
    // Initialize configuration storage
    configStorage.begin();
    bool stored = configStorage.loadConfiguration();
    bool haveValidStored = stored && configStorage.hasValidConfiguration();

    if (haveValidStored) {
        // Apply runtime Toggl configuration from storage
        togglAPI.setCredentials(configStorage.getTogglToken(), configStorage.getWorkspaceId());
        togglAPI.setProjectIds(configStorage.getProjectIds());

        // Connect to WiFi using stored credentials
        int wifiRetries = 3;
        while (!networkManager.connectToWiFi(configStorage.getWifiSSID(), configStorage.getWifiPassword()) && wifiRetries > 0) {
            wifiRetries--;
            delay(5000);
        }
        if (wifiRetries == 0) {
            if (Serial) Serial.println("WiFi connect with stored config failed, entering BLE setup mode");
            // Enter BLE setup mode for reconfiguration
            if (simpleBLEBegin()) {
                bleActive = true;
                if (Serial) Serial.println("BLE setup mode activated for reconfiguration");
            }
        } else {
            if (Serial) Serial.println("Using stored configuration, starting normal operation");
        }
    } else {
        // No valid configuration: enter BLE setup mode
        if (Serial) Serial.println("No valid stored configuration found, starting BLE setup mode...");
        if (simpleBLEBegin()) {
            bleActive = true;
            if (Serial) Serial.println("BLE setup mode activated successfully");
        } else {
            if (Serial) Serial.println("BLE failed to start; cannot enter setup mode");
        }
    }
    
    if (Serial) Serial.println("TimeTracker Cube Ready!");
}

void loop() {
    // If BLE setup mode is active, handle configuration workflow
    if (bleActive) {
        simpleBLEPoll();
        
        // Check if configuration is complete and apply it
        if (isConfigComplete() && !configApplied) {
            configApplied = true;
            
            if (Serial) Serial.println("Configuration received via BLE, testing WiFi connection...");
            
            // Test WiFi connection with received credentials
            if (networkManager.connectToWiFi(getWifiSSID(), getWifiPassword())) {
                if (Serial) Serial.println("WiFi connected! Saving configuration...");
                
                // Use received workspace ID if available, otherwise use default
                String workspaceId = getWorkspaceId();
                if (workspaceId.length() == 0) {
                    workspaceId = "123456"; // Default workspace ID
                }
                
                // Use received project IDs if available, otherwise use defaults
                const int* receivedProjectIds = getProjectIds();
                int* projectIdsToUse = defaultProjectIds;
                bool hasReceivedProjects = false;
                for (int i = 0; i < 6; i++) {
                    if (receivedProjectIds[i] != 0) {
                        hasReceivedProjects = true;
                        break;
                    }
                }
                if (hasReceivedProjects) {
                    projectIdsToUse = (int*)receivedProjectIds;
                }
                
                // Save configuration to storage
                configStorage.saveConfiguration(
                    getWifiSSID(),
                    getWifiPassword(),
                    getTogglToken(),
                    workspaceId,
                    projectIdsToUse
                );
                
                // Apply Toggl configuration
                togglAPI.setCredentials(getTogglToken(), workspaceId);
                togglAPI.setProjectIds(projectIdsToUse);
                
                // Exit BLE mode and continue with normal operation
                BLE.stopAdvertise();
                bleActive = false;
                
                if (Serial) Serial.println("Configuration complete! Entering normal time tracking mode.");
                
                // Show success with LED
                ledController.setColor(0, 255, 0); // Green
                delay(2000);
                ledController.turnOff();
                
            } else {
                if (Serial) Serial.println("WiFi connection failed with provided credentials");
                configApplied = false; // Allow retry
                
                // Show error with LED
                ledController.showError();
            }
        }
        
        // Show BLE setup mode with blue LED (RP2040) or slow pulse (33 IoT) 
        static unsigned long lastLEDUpdate = 0;
        if (millis() - lastLEDUpdate > 2000) {
            ledController.setColor(0, 0, 128); // Dim blue for setup mode
            lastLEDUpdate = millis();
        }
        
        // Skip normal operation while in BLE mode
        delay(50);
        return;
    }
    
    // Normal TimeTracker operation
    
    // Check network connectivity
    networkManager.reconnectIfNeeded();
    
    // Read IMU data and handle orientation changes
    if (IMU.accelerationAvailable()) {
        IMU.readAcceleration(accelX, accelY, accelZ);
        
        // Determine current orientation
        Orientation newOrientation = orientationDetector.detectOrientation(accelX, accelY, accelZ);
        
        // Check if orientation changed and handle debouncing
        if (orientationDetector.hasOrientationChanged(newOrientation)) {
            
            // Stop current timer if running
            if (!togglAPI.getCurrentEntryId().isEmpty()) {
                togglAPI.stopCurrentTimeEntry();
            }
            
            // Update orientation
            orientationDetector.updateOrientation(newOrientation);
            
            // Update LED color/pattern for new orientation
            ledController.updateColorForOrientation(newOrientation, Config::LED_MAX_INTENSITY);
            
            // Print orientation info for debugging
            orientationDetector.printOrientation(newOrientation, accelX, accelY, accelZ);
            
            // Start new timer if orientation is known and not break time
            if (newOrientation != UNKNOWN && newOrientation != FACE_UP) {
                String description = orientationDetector.getOrientationName(newOrientation);
                togglAPI.startTimeEntry(newOrientation, description);
            } else if (newOrientation == FACE_UP) {
                if (Serial) Serial.println("Break time - timer stopped, no new entry started");
            }
        }
    }
    
    // Small delay for stability
    delay(50);
}