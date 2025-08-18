#include "Configuration.h"

const char *ssid = "youmoni-guest";
const char *password = "IoT99Rul3s.";

const char *togglApiToken = "8512ae2df80f50ecaa5a7e0c4c96cc57";
const int workspaceId = 20181448; // YOUR_WORKSPACE_ID

const char* projectNames[6] = {
    "Break Time",         // FACE_UP (now stops timers)
    "Face Down Project",  // FACE_DOWN  
    "Left Side Project",  // LEFT_SIDE
    "Right Side Project", // RIGHT_SIDE
    "Front Edge Project", // FRONT_EDGE
    "Back Edge Project"   // BACK_EDGE (now an active project)
};

// Direct Toggl project ID mapping for each orientation
// FACE_UP = 0 (disabled, break time), others set to your actual project IDs
const int orientationProjectIds[6] = {
    0,          // FACE_UP - disabled (break time)
    212267805,          // FACE_DOWN - set to your project ID
    212267804,          // LEFT_SIDE - set to your project ID  
    212267807,          // RIGHT_SIDE - set to your project ID
    212267806,          // FRONT_EDGE - set to your project ID
    212267809           // BACK_EDGE - set to your project ID
};