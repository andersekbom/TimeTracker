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
    int projectIds[6];
    
    String base64Encode(const String& str);
    String getCurrentTimeISO();
    void populateProjectIds(const String& response);

public:
    TogglAPI(HttpClient* httpClient);
    
    bool getProjects();
    bool startTimeEntry(int orientationIndex, const String& description);
    bool stopCurrentTimeEntry();
    
    String getCurrentEntryId() const { return currentTimeEntryId; }
    String getCurrentEntryName() const { return currentTimeEntryName; }
    int getProjectId(int orientationIndex) const;
    
    // Note: No longer needs external time setting since using millis() based timing
};

#endif // TOGGL_API_H