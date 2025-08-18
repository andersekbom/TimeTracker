#include "TogglAPI.h"
#include "Configuration.h"
#include "Config.h"

TogglAPI::TogglAPI(HttpClient* httpClient) : client(httpClient) {
    currentTimeEntryId = "";
    currentTimeEntryName = "";
}

String TogglAPI::base64Encode(const String& str) {
    const char base64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    String encoded = "";
    int i = 0;
    unsigned char char_array_3[3];
    unsigned char char_array_4[4];

    const char *bytes_to_encode = str.c_str();
    int in_len = str.length();

    while (i < in_len) {
        char_array_3[0] = bytes_to_encode[i++];
        char_array_3[1] = (i < in_len) ? bytes_to_encode[i++] : 0;
        char_array_3[2] = (i < in_len) ? bytes_to_encode[i++] : 0;

        char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
        char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
        char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
        char_array_4[3] = char_array_3[2] & 0x3f;

        for (int j = 0; j < 4; j++) {
            encoded += base64_chars[char_array_4[j]];
        }
    }

    // Add padding if needed
    int padding = 3 - (in_len % 3);
    if (padding != 3) {
        for (int j = 0; j < padding; j++) {
            encoded[encoded.length() - 1 - j] = '=';
        }
    }

    return encoded;
}

String TogglAPI::getCurrentTimeISO() {
    // Use a simplified timestamp approach for Toggl API
    // Since we only need relative timing and stop entries use server time,
    // we can use a base date plus elapsed milliseconds
    
    unsigned long secondsSinceStart = millis() / 1000;
    
    // Use a fixed base date (e.g., 2025-01-01) plus elapsed time
    // This provides consistent relative timing without NTP dependency
    int year = 2025;
    int month = 1;
    int day = 1;
    
    // Add elapsed days
    int daysElapsed = secondsSinceStart / 86400;
    day += daysElapsed;
    
    // Simple month overflow handling
    while (day > 31) {
        day -= 31;
        month++;
        if (month > 12) {
            month = 1;
            year++;
        }
    }
    
    // Calculate time of day
    unsigned long secondsToday = secondsSinceStart % 86400;
    unsigned long hours = secondsToday / 3600;
    unsigned long minutes = (secondsToday % 3600) / 60;
    unsigned long seconds = secondsToday % 60;

    // Format as ISO 8601 string
    String iso = String(year) + "-";
    if (month < 10) iso += "0";
    iso += String(month) + "-";
    if (day < 10) iso += "0";
    iso += String(day) + "T";
    if (hours < 10) iso += "0";
    iso += String(hours) + ":";
    if (minutes < 10) iso += "0";
    iso += String(minutes) + ":";
    if (seconds < 10) iso += "0";
    iso += String(seconds) + "Z";

    return iso;
}



bool TogglAPI::startTimeEntry(int orientationIndex, const String& description) {
    if (!client || orientationIndex < 0 || orientationIndex >= 6) return false;

    JsonDocument timeEntry;
    timeEntry["description"] = description;
    timeEntry["workspace_id"] = workspaceId;

    int projectId = orientationProjectIds[orientationIndex];
    if (projectId != 0) {
        timeEntry["project_id"] = projectId;
    }
    
    timeEntry["start"] = getCurrentTimeISO();
    timeEntry["duration"] = -1;
    timeEntry["created_with"] = "CubeToggler";

    String jsonString;
    serializeJson(timeEntry, jsonString);

    client->beginRequest();
    client->post("/api/v9/time_entries");
    client->sendHeader("Content-Type", "application/json");
    client->sendHeader("Authorization", "Basic " + base64Encode(String(togglApiToken) + ":api_token"));
    client->sendHeader("Content-Length", jsonString.length());
    client->beginBody();
    client->print(jsonString);
    client->endRequest();

    int statusCode = client->responseStatusCode();
    String response = client->responseBody();

    if (statusCode == 200) {
        JsonDocument responseDoc;
        DeserializationError error = deserializeJson(responseDoc, response);
        
        if (!error) {
            currentTimeEntryName = responseDoc["description"].as<String>();
            currentTimeEntryId = responseDoc["id"].as<String>();
            Serial.print("Started time entry: " + currentTimeEntryName + " (");
            Serial.print(currentTimeEntryId);
            Serial.println(")");
            return true;
        }
    }
    
    Serial.print("Failed to start time entry. Status: ");
    Serial.println(statusCode);
    currentTimeEntryId = "";
    return false;
}

bool TogglAPI::stopCurrentTimeEntry() {
    if (currentTimeEntryId == "" || !client) return false;

    Serial.println("Stopping current time entry...");

    String endpoint = "/api/v9/workspaces/" + String(workspaceId) + "/time_entries/" + currentTimeEntryId + "/stop";
    
    client->beginRequest();
    client->patch(endpoint);
    client->sendHeader("Content-Type", "application/json");
    client->sendHeader("Authorization", "Basic " + base64Encode(String(togglApiToken) + ":api_token"));
    client->endRequest();

    int statusCode = client->responseStatusCode();
    
    if (statusCode == 200) {
        Serial.print("Stopped time entry ID: ");
        Serial.println(currentTimeEntryId);
        currentTimeEntryId = "";
        return true;
    } else {
        Serial.print("Failed to stop time entry. Status: ");
        Serial.println(statusCode);
        return false;
    }
}

int TogglAPI::getProjectId(int orientationIndex) const {
    if (orientationIndex >= 0 && orientationIndex < 6) {
        return orientationProjectIds[orientationIndex];
    }
    return 0;
}

// Note: setCurrentTime method removed - using millis() based timing instead