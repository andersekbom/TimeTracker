#ifndef SYSTEM_UTILS_H
#define SYSTEM_UTILS_H

#include <Arduino.h>
#include "LEDController.h"
#include "OrientationDetector.h"
#include "NetworkManager.h"
#include "TogglAPI.h"
#include "ConfigStorage.h"

/**
 * System initialization and utility functions
 */
namespace SystemUtils {
    
    /**
     * Initialize serial communication with timeout for standalone operation
     */
    void initializeSerial();
    
    /**
     * Initialize LED controller with retries
     * @param ledController Reference to LED controller
     * @return true if successful, false if failed after retries
     */
    bool initializeLED(LEDController& ledController);
    
    /**
     * Initialize IMU with retries
     * @param orientationDetector Reference to orientation detector
     * @return true if successful, false if failed after retries
     */
    bool initializeIMU(OrientationDetector& orientationDetector);
    
    /**
     * Initialize configuration system and determine startup mode
     * @param configStorage Reference to config storage
     * @param togglAPI Reference to Toggl API
     * @param networkManager Reference to network manager
     * @return true if stored config exists and is valid, false if BLE setup needed
     */
    bool initializeConfiguration(ConfigStorage& configStorage, TogglAPI& togglAPI, NetworkManager& networkManager);
    
    /**
     * Apply BLE configuration to system
     * @param configStorage Reference to config storage
     * @param togglAPI Reference to Toggl API
     * @param ledController Reference to LED controller
     * @return true if configuration applied successfully
     */
    bool applyBLEConfiguration(ConfigStorage& configStorage, TogglAPI& togglAPI, LEDController& ledController);
    
    /**
     * Show status LEDs for different system states
     */
    void showBLESetupStatus(LEDController& ledController);
    void showSuccess(LEDController& ledController);
    void showError(LEDController& ledController);
}

#endif // SYSTEM_UTILS_H