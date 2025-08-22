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
    if (Serial) Serial.println("[DEBUG] handleNormalOperation() start");
    
    // Network connectivity check - DISABLED due to crashes with BLE active
    // The WiFi connection remains stable after initial setup
    // Periodic checks cause device hangs when BLE is simultaneously active
    static unsigned long lastNetworkCheck = 0;
    unsigned long currentTime = millis();
    
    if (currentTime - lastNetworkCheck > 30000) {
        if (Serial) Serial.println("[DEBUG] Network check skipped - prevents crashes with dual BLE/WiFi");
        lastNetworkCheck = currentTime;
    }
    
    // Read IMU data and handle orientation changes
    float accelX, accelY, accelZ;
    if (Serial) Serial.println("[DEBUG] Checking IMU availability");
    if (IMU.accelerationAvailable()) {
        if (Serial) Serial.println("[DEBUG] Reading IMU data");
        IMU.readAcceleration(accelX, accelY, accelZ);
        if (Serial) Serial.println("[DEBUG] IMU data read complete");
        
        // Determine current orientation
        if (Serial) Serial.println("[DEBUG] Detecting orientation");
        Orientation newOrientation = orientationDetector.detectOrientation(accelX, accelY, accelZ);
        if (Serial) Serial.println("[DEBUG] Orientation detection complete");
        
        // Check if orientation changed and handle debouncing
        if (Serial) Serial.println("[DEBUG] Checking orientation change");
        if (orientationDetector.hasOrientationChanged(newOrientation)) {
            if (Serial) Serial.println("[DEBUG] Orientation changed - handling");
            handleOrientationChange(newOrientation, accelX, accelY, accelZ);
            if (Serial) Serial.println("[DEBUG] Orientation change handled");
        } else {
            if (Serial) Serial.println("[DEBUG] No orientation change");
        }
    } else {
        if (Serial) Serial.println("[DEBUG] IMU not available");
    }
    
    // Small delay for stability
    if (Serial) Serial.println("[DEBUG] Main loop delay");
    delay(Config::MAIN_LOOP_DELAY);
    if (Serial) Serial.println("[DEBUG] handleNormalOperation() end");
}

void StateManager::handleOrientationChange(Orientation newOrientation, float accelX, float accelY, float accelZ) {
    if (Serial) Serial.println("[DEBUG] handleOrientationChange() start");
    
    // Stop current timer if running
    if (Serial) Serial.println("[DEBUG] Checking for current timer");
    if (!togglAPI.getCurrentEntryId().isEmpty()) {
        if (Serial) Serial.println("[DEBUG] Stopping current timer with timeout protection");
        bool success = togglAPI.stopCurrentTimeEntry();
        if (success) {
            if (Serial) Serial.println("[DEBUG] Timer stopped successfully");
        } else {
            if (Serial) Serial.println("[DEBUG] Timer stop failed - continuing anyway");
        }
    } else {
        if (Serial) Serial.println("[DEBUG] No current timer to stop");
    }
    
    // Update orientation
    if (Serial) Serial.println("[DEBUG] Updating orientation");
    orientationDetector.updateOrientation(newOrientation);
    if (Serial) Serial.println("[DEBUG] Orientation updated");
    
    // Update LED color/pattern for new orientation
    if (Serial) Serial.println("[DEBUG] Updating LED");
    ledController.updateColorForOrientation(newOrientation, Config::LED_MAX_INTENSITY);
    if (Serial) Serial.println("[DEBUG] LED updated");
    
    // Print orientation info for debugging
    if (Serial) Serial.println("[DEBUG] Printing orientation info");
    orientationDetector.printOrientation(newOrientation, accelX, accelY, accelZ);
    if (Serial) Serial.println("[DEBUG] Orientation info printed");
    
    // Start new timer if orientation is known and not timer stopped
    if (Serial) Serial.println("[DEBUG] Checking if should start timer");
    if (newOrientation != UNKNOWN && newOrientation != FACE_UP) {
        String description = orientationDetector.getOrientationName(newOrientation);
        
        if (Serial) Serial.println("[DEBUG] Starting timer with timeout protection for: " + description);
        bool success = togglAPI.startTimeEntry(newOrientation, description);
        
        if (success) {
            if (Serial) Serial.println("[DEBUG] Timer started successfully");
        } else {
            if (Serial) Serial.println("[DEBUG] Timer start failed - continuing anyway");
        }
        
    } else if (newOrientation == FACE_UP) {
        if (Serial) Serial.println("Timer stopped, no new entry started");
        if (Serial) Serial.println("[DEBUG] Timer stop handled");
    } else {
        if (Serial) Serial.println("[DEBUG] Unknown orientation - no timer action");
    }
    
    if (Serial) Serial.println("[DEBUG] handleOrientationChange() end");
}

void StateManager::updateBLEStatusLED() {
    if (millis() - lastLEDUpdate > Config::BLE_LED_UPDATE_INTERVAL) {
        SystemUtils::showBLESetupStatus(ledController);
        lastLEDUpdate = millis();
    }
}