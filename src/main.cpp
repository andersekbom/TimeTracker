#include <Arduino.h>
#include <WiFiNINA.h>
#include <ArduinoBLE.h>

// Declare functions from SimpleBLEConfig.cpp
bool simpleBLEBegin();
void simpleBLEPoll();
bool isConfigComplete();
String getWifiSSID();
String getWifiPassword();
String getTogglToken();

bool bleActive = false;
bool configTested = false;

void setup() {
    Serial.begin(115200);
    
    // Wait for serial connection
    unsigned long timeout = millis() + 3000;
    while (!Serial && millis() < timeout) {
        delay(100);
    }
    
    Serial.println("TimeTracker Simple BLE Test Starting...");
    
    // Start BLE configuration service
    if (simpleBLEBegin()) {
        bleActive = true;
        Serial.println("BLE configuration service active");
        Serial.println("Use nRF Connect to configure:");
        Serial.println("1. Write WiFi SSID to characteristic 6ba7b811-...");
        Serial.println("2. Write WiFi password to characteristic 6ba7b812-...");  
        Serial.println("3. Write Toggl token to characteristic 6ba7b813-...");
    } else {
        Serial.println("Failed to start BLE service");
    }
}

void loop() {
    if (bleActive) {
        simpleBLEPoll();
        
        // Check if configuration is complete and test WiFi
        if (isConfigComplete() && !configTested) {
            configTested = true;
            
            Serial.println("Testing WiFi connection with received credentials...");
            Serial.print("SSID: ");
            Serial.println(getWifiSSID());
            Serial.println("Password: (hidden)");
            Serial.print("Toggl Token Length: ");
            Serial.println(getTogglToken().length());
            
            // Test WiFi connection
            int connectionAttempts = 0;
            const int maxAttempts = 10;
            
            Serial.print("Connecting to WiFi");
            while (WiFi.begin(getWifiSSID().c_str(), getWifiPassword().c_str()) != WL_CONNECTED && connectionAttempts < maxAttempts) {
                Serial.print(".");
                connectionAttempts++;
                delay(1000);
            }
            
            if (connectionAttempts < maxAttempts) {
                Serial.println();
                Serial.print("WiFi connected! IP address: ");
                Serial.println(WiFi.localIP());
                Serial.println("SUCCESS: BLE configuration working!");
                
                // Stop BLE advertising
                BLE.stopAdvertise();
                bleActive = false;
            } else {
                Serial.println();
                Serial.println("WiFi connection failed. Check credentials.");
                configTested = false; // Allow retry
            }
        }
    }
    
    delay(100);
}