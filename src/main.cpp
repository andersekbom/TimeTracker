#include <Arduino.h>
#include <ArduinoHttpClient.h>

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
        // Continue with basic operation - LED failures are not critical
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
        // Continue with limited functionality
    }
    
    // Connect to WiFi
    int wifiRetries = 3;
    while (!networkManager.connectToWiFi() && wifiRetries > 0) {
        wifiRetries--;
        delay(5000);
    }
    if (wifiRetries == 0) {
        if (Serial) Serial.println("Warning: WiFi failed - offline mode");
        ledController.showError(); // Brief error indication
        delay(2000);
        // Continue in offline mode
    }
    
    // Note: NTP time sync removed - using millis() based timing for API calls
    // Note: Using direct project ID mapping - no need to load projects from Toggl
    
    if (Serial) Serial.println("TimeTracker Cube Ready!");
}

void loop() {
    // Check network connectivity
    networkManager.reconnectIfNeeded();
    
    // Note: Periodic time updates removed - using millis() based timing
    
    // Read IMU data
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
            
            // Update LED color for new orientation
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