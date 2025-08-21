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
#include "SystemUtils.h"
#include "StateManager.h"

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


// Configuration and state management
ConfigStorage configStorage;
StateManager stateManager(ledController, networkManager, orientationDetector, togglAPI, configStorage);

void setup() {
    // Initialize serial communication
    SystemUtils::initializeSerial();
    
    // Initialize hardware components
    SystemUtils::initializeLED(ledController);
    
    bool imuOK = SystemUtils::initializeIMU(orientationDetector);
    if (!imuOK) {
        SystemUtils::showError(ledController);
        delay(Config::ERROR_DISPLAY_DELAY);
    }
    
    // Initialize configuration and determine startup mode
    bool hasValidConfig = SystemUtils::initializeConfiguration(configStorage, togglAPI, networkManager);
    
    // ALWAYS start BLE for always-configurable device (regardless of existing config)
    if (simpleBLEBegin()) {
        stateManager.setBLEActive(true);
        if (hasValidConfig) {
            if (Serial) Serial.println("BLE dual-mode activated (WiFi configured, BLE always available)");
        } else {
            if (Serial) Serial.println("BLE setup mode activated (no configuration)");
        }
    } else {
        if (Serial) Serial.println("BLE failed to start; device not configurable");
    }
    
    if (Serial) Serial.println("TimeTracker Cube Ready!");
}

void loop() {
    // DUAL-MODE OPERATION: Always run BLE when active, plus normal operation when configured
    if (stateManager.isBLEActive()) {
        // Always handle BLE (for always-on reconfiguration capability)
        stateManager.handleBLEMode();
        
        // Also run normal TimeTracker operation if configuration is applied
        if (configStorage.hasValidConfiguration()) {
            stateManager.handleNormalOperation();
        }
    } else {
        // Fallback: Normal TimeTracker operation only (shouldn't happen in always-configurable mode)
        stateManager.handleNormalOperation();
    }
}