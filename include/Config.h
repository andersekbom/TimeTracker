#ifndef CONFIG_H
#define CONFIG_H

// Configuration constants
namespace Config {
    // Orientation detection
    constexpr float ORIENTATION_THRESHOLD = 0.75f;
    constexpr unsigned long DEBOUNCE_TIME = 5000;
    
    // Network settings
    constexpr int TOGGL_PORT = 443;
    constexpr char TOGGL_SERVER[] = "api.track.toggl.com";
    
    // Serial communication
    constexpr int SERIAL_BAUD = 115200;
    constexpr int MONITOR_BAUD = 115200;
    
    // LED settings
    constexpr int LED_MAX_INTENSITY = 100;
    
    // Timing constants
    constexpr unsigned long SERIAL_TIMEOUT_MS = 3000;
    constexpr unsigned long BLE_LED_UPDATE_INTERVAL = 2000;
    constexpr unsigned long MAIN_LOOP_DELAY = 50;
    
    // Retry counts
    constexpr int LED_INIT_RETRIES = 3;
    constexpr int IMU_INIT_RETRIES = 5;
    constexpr int WIFI_CONNECT_RETRIES = 3;
    
    // Retry delays
    constexpr unsigned long LED_RETRY_DELAY = 1000;
    constexpr unsigned long IMU_RETRY_DELAY = 2000;
    constexpr unsigned long WIFI_RETRY_DELAY = 5000;
    constexpr unsigned long ERROR_DISPLAY_DELAY = 2000;
    constexpr unsigned long SUCCESS_DISPLAY_DELAY = 2000;
    
    // Default project IDs (for testing)
    extern int DEFAULT_PROJECT_IDS[6];
    
    // Project mapping indices
    enum OrientationIndex {
        FACE_UP_IDX = 0,
        FACE_DOWN_IDX = 1,
        LEFT_SIDE_IDX = 2,
        RIGHT_SIDE_IDX = 3,
        FRONT_EDGE_IDX = 4,
        BACK_EDGE_IDX = 5
    };
    
    // Color definitions for BLE setup mode
    constexpr int BLE_SETUP_COLOR[3] = {0, 0, 128}; // Dim blue
    constexpr int SUCCESS_COLOR[3] = {0, 255, 0};   // Green
}
}

#endif // CONFIG_H