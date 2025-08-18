#include "NetworkManager.h"
#include "Configuration.h"
#include "Config.h"

NetworkManager::NetworkManager() {
}

bool NetworkManager::connectToWiFi() {
    Serial.print("Connecting to WiFi with SSID ");
    Serial.println(ssid);

    int connectionAttempts = 0;
    const int maxAttempts = 20; // Limit connection attempts
    
    while (WiFi.begin(ssid, password) != WL_CONNECTED && connectionAttempts < maxAttempts) {
        Serial.print(".");
        flashConnectionStatus(true); // Flash while connecting
        connectionAttempts++;
        delay(1000); // Add delay between attempts
    }
    
    if (connectionAttempts >= maxAttempts) {
        Serial.println("\nWiFi connection failed after maximum attempts");
        return false;
    }
    
    Serial.println();
    Serial.print("Connected! IP address: ");
    Serial.println(WiFi.localIP());
    
    flashConnectionStatus(false); // Flash green to indicate success
    return true;
}

bool NetworkManager::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

void NetworkManager::reconnectIfNeeded() {
    if (!isConnected()) {
        Serial.println("WiFi disconnected, reconnecting...");
        connectToWiFi();
    }
}

// Note: NTP time synchronization methods removed - using millis() based timing instead

void NetworkManager::flashConnectionStatus(bool connecting) {
    // Simple serial feedback - LED control handled externally
    if (connecting) {
        Serial.print(".");
    } else {
        Serial.println(" Connected!");
    }
}