#ifndef TOGGL_API_H
#define TOGGL_API_H

#include <Arduino.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>

class TogglAPI {
private:
    HttpClient* client;
    String currentTimeEntryId;
    String currentTimeEntryName;
    
    // Runtime configuration (overrides compile-time Configuration.h when provided)
    String runtimeToken;
    String runtimeWorkspaceId; // kept as string for easy path building
    int runtimeProjectIds[6] = {0,0,0,0,0,0};
    bool hasRuntimeConfig = false;
    
    String base64Encode(const String& str);

public:
    TogglAPI(HttpClient* httpClient);
    
    bool startTimeEntry(int orientationIndex, const String& description);
    bool stopCurrentTimeEntry();
    
    String getCurrentEntryId() const { return currentTimeEntryId; }
    String getCurrentEntryName() const { return currentTimeEntryName; }
    int getProjectId(int orientationIndex) const;
    
    // Runtime configuration setters
    void setCredentials(const String& token, const String& workspaceId);
    void setProjectIds(const int* ids);
    void clearRuntimeConfig();
    
    // Note: No longer needs external time setting since using millis() based timing
};

#endif // TOGGL_API_H
