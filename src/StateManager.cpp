#include "StateManager.h"
#include "SystemUtils.h"
#include "Config.h"
#include <ArduinoBLE.h>

// Platform-specific includes
#if defined(ARDUINO_ARCH_SAMD) || defined(ARDUINO_NANO33BLE)
  #include <Arduino_LSM6DSOX.h>
#elif defined(ARDUINO_ARCH_ESP32)
  #include <LSM6DS3.h>
#else
  #include <Arduino_LSM6DSOX.h>
#endif

// External BLE functions
extern void simpleBLEPoll();

StateManager::StateManager(LEDController& led, NetworkManager& network, OrientationDetector& orientation, 
                         TogglAPI& toggl, ConfigStorage& config)
    : ledController(led), networkManager(network), orientationDetector(orientation), 
      togglAPI(toggl), configStorage(config) {
}

bool StateManager::handleBLEMode() {
    simpleBLEPoll();
    
    // Check if configuration is complete and apply it
    if (!configApplied) {
        if (SystemUtils::applyBLEConfiguration(configStorage, togglAPI, ledController)) {
            configApplied = true;
            
            // DUAL-MODE: Keep BLE active alongside WiFi for always-on reconfiguration
            // Do NOT stop advertising - device must remain configurable
            Serial.println("Configuration applied - entering dual-mode (WiFi + BLE)");
            
            // Continue in BLE mode but also enable normal operation
            return true; // Stay in dual-mode
        }
    }
    
    // Show BLE setup mode with status LED (only if not configured)
    if (!configApplied) {
        updateBLEStatusLED();
    }
    
    // Continue in BLE mode
    delay(Config::MAIN_LOOP_DELAY);
    return true;
}

void StateManager::handleNormalOperation() {
    // Check network connectivity
    networkManager.reconnectIfNeeded();
    
    // Read IMU data and handle orientation changes
    float accelX, accelY, accelZ;
    if (IMU.accelerationAvailable()) {
        IMU.readAcceleration(accelX, accelY, accelZ);
        
        // Determine current orientation
        Orientation newOrientation = orientationDetector.detectOrientation(accelX, accelY, accelZ);
        
        // Check if orientation changed and handle debouncing
        if (orientationDetector.hasOrientationChanged(newOrientation)) {
            handleOrientationChange(newOrientation, accelX, accelY, accelZ);
        }
    }
    
    // Small delay for stability
    delay(Config::MAIN_LOOP_DELAY);
}

void StateManager::handleOrientationChange(Orientation newOrientation, float accelX, float accelY, float accelZ) {
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

void StateManager::updateBLEStatusLED() {
    if (millis() - lastLEDUpdate > Config::BLE_LED_UPDATE_INTERVAL) {
        SystemUtils::showBLESetupStatus(ledController);
        lastLEDUpdate = millis();
    }
}