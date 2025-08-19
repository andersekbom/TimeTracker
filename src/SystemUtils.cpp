#include "SystemUtils.h"
#include "Config.h"

// External BLE functions
extern bool simpleBLEBegin();
extern bool isConfigComplete();
extern String getWifiSSID();
extern String getWifiPassword(); 
extern String getTogglToken();
extern String getWorkspaceId();
extern const int* getProjectIds();

namespace SystemUtils {

    void initializeSerial() {
        Serial.begin(Config::SERIAL_BAUD);
        
        // Optional serial connection with timeout for standalone operation
        unsigned long serialTimeout = millis() + Config::SERIAL_TIMEOUT_MS;
        while (!Serial && millis() < serialTimeout) {
            delay(100);
        }
        
        if (Serial) {
            Serial.println("TimeTracker Cube Starting...");
        }
    }

    bool initializeLED(LEDController& ledController) {
        int retries = Config::LED_INIT_RETRIES;
        while (!ledController.begin() && retries > 0) {
            retries--;
            delay(Config::LED_RETRY_DELAY);
        }
        
        if (retries == 0) {
            if (Serial) Serial.println("Warning: LED controller failed to initialize");
            return false;
        }
        return true;
    }

    bool initializeIMU(OrientationDetector& orientationDetector) {
        int retries = Config::IMU_INIT_RETRIES;
        while (!orientationDetector.begin() && retries > 0) {
            retries--;
            delay(Config::IMU_RETRY_DELAY);
        }
        
        if (retries == 0) {
            if (Serial) Serial.println("Critical: IMU failed - basic operation only");
            return false;
        }
        return true;
    }

    bool initializeConfiguration(ConfigStorage& configStorage, TogglAPI& togglAPI, NetworkManager& networkManager) {
        configStorage.begin();
        bool stored = configStorage.loadConfiguration();
        bool haveValidStored = stored && configStorage.hasValidConfiguration();

        if (haveValidStored) {
            // Apply runtime Toggl configuration from storage
            togglAPI.setCredentials(configStorage.getTogglToken(), configStorage.getWorkspaceId());
            togglAPI.setProjectIds(configStorage.getProjectIds());

            // Connect to WiFi using stored credentials
            int wifiRetries = Config::WIFI_CONNECT_RETRIES;
            while (!networkManager.connectToWiFi(configStorage.getWifiSSID(), configStorage.getWifiPassword()) && wifiRetries > 0) {
                wifiRetries--;
                delay(Config::WIFI_RETRY_DELAY);
            }
            
            if (wifiRetries == 0) {
                if (Serial) Serial.println("WiFi connect with stored config failed, entering BLE setup mode");
                return false; // Need BLE setup
            } else {
                if (Serial) Serial.println("Using stored configuration, starting normal operation");
                return true; // Normal operation
            }
        } else {
            if (Serial) Serial.println("No valid stored configuration found, starting BLE setup mode...");
            return false; // Need BLE setup
        }
    }

    bool applyBLEConfiguration(ConfigStorage& configStorage, TogglAPI& togglAPI, LEDController& ledController) {
        if (!isConfigComplete()) {
            return false;
        }

        if (Serial) Serial.println("Configuration received via BLE, testing WiFi connection...");
        
        // Create temporary NetworkManager for testing
        NetworkManager tempNetworkManager;
        
        // Test WiFi connection with received credentials
        if (tempNetworkManager.connectToWiFi(getWifiSSID(), getWifiPassword())) {
            if (Serial) Serial.println("WiFi connected! Saving configuration...");
            
            // Use received workspace ID if available, otherwise use placeholder
            String workspaceId = getWorkspaceId();
            if (workspaceId.length() == 0) {
                workspaceId = "0"; // Placeholder workspace ID
            }
            
            // Use received project IDs if available, otherwise use defaults
            const int* receivedProjectIds = getProjectIds();
            int* projectIdsToUse = Config::DEFAULT_PROJECT_IDS;
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
            
            if (Serial) Serial.println("Configuration complete! Entering normal time tracking mode.");
            
            showSuccess(ledController);
            return true;
            
        } else {
            if (Serial) Serial.println("WiFi connection failed with provided credentials");
            showError(ledController);
            return false;
        }
    }

    void showBLESetupStatus(LEDController& ledController) {
        ledController.setColor(Config::BLE_SETUP_COLOR[0], Config::BLE_SETUP_COLOR[1], Config::BLE_SETUP_COLOR[2]);
    }

    void showSuccess(LEDController& ledController) {
        ledController.setColor(Config::SUCCESS_COLOR[0], Config::SUCCESS_COLOR[1], Config::SUCCESS_COLOR[2]);
        delay(Config::SUCCESS_DISPLAY_DELAY);
        ledController.turnOff();
    }

    void showError(LEDController& ledController) {
        ledController.showError();
    }
}