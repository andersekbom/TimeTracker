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
    
    // Project mapping indices
    enum OrientationIndex {
        FACE_UP_IDX = 0,
        FACE_DOWN_IDX = 1,
        LEFT_SIDE_IDX = 2,
        RIGHT_SIDE_IDX = 3,
        FRONT_EDGE_IDX = 4,
        BACK_EDGE_IDX = 5
    };
}

#endif // CONFIG_H