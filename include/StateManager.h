#ifndef STATE_MANAGER_H
#define STATE_MANAGER_H

#include <Arduino.h>
#include "LEDController.h"
#include "NetworkManager.h"
#include "OrientationDetector.h"
#include "TogglAPI.h"
#include "ConfigStorage.h"

/**
 * Manages TimeTracker system state and main loop operations
 */
class StateManager {
public:
    StateManager(LEDController& led, NetworkManager& network, OrientationDetector& orientation, 
                 TogglAPI& toggl, ConfigStorage& config);
    
    /**
     * Handle BLE setup mode operations
     * @return true to continue BLE mode, false to exit to normal operation
     */
    bool handleBLEMode();
    
    /**
     * Handle normal TimeTracker operation
     */
    void handleNormalOperation();
    
    /**
     * Set BLE active state
     */
    void setBLEActive(bool active) { bleActive = active; }
    bool isBLEActive() const { return bleActive; }

private:
    LEDController& ledController;
    NetworkManager& networkManager;
    OrientationDetector& orientationDetector;
    TogglAPI& togglAPI;
    ConfigStorage& configStorage;
    
    bool bleActive = false;
    bool configApplied = false;
    unsigned long lastLEDUpdate = 0;
    
    void handleOrientationChange(Orientation newOrientation, float accelX, float accelY, float accelZ);
    void updateBLEStatusLED();
};

#endif // STATE_MANAGER_H