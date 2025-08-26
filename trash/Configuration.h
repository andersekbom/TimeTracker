#ifndef CONFIGURATION_H
#define CONFIGURATION_H

// WiFi Configuration
extern const char *ssid;
extern const char *password;

// Toggl API Configuration - KEEP THESE SECRET!
extern const char *togglApiToken;
extern const int workspaceId;

// Project names for each orientation (for display purposes)
extern const char* projectNames[6];

// Direct Toggl project ID mapping for each orientation
// Set to 0 to disable orientation, or use actual Toggl project ID
extern const int orientationProjectIds[6];

#endif // CONFIGURATION_H