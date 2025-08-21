#include "SystemDiagnostics.h"

SystemDiagnostics::SystemDiagnostics() {
    // Initialize performance metrics
    for (int i = 0; i < LOOP_TIME_BUFFER_SIZE; i++) {
        loopTimes[i] = 0;
    }
    loopTimeIndex = 0;
    maxLoopTime = 0;
    
    // Initialize status variables
    wifiConnected = false;
    wifiRSSI = 0;
    lastWiFiDisconnectTime = 0;
    
    bleActive = false;
    bleConnections = 0;
    lastBLEActivityTime = 0;
    
    apiSuccessCount = 0;
    apiTotalCount = 0;
    lastAPIFailureTime = 0;
    
    storageHealthy = true;
    lastStorageErrorTime = 0;
    
    bootTime = millis();
    systemHealthy = true;
}

bool SystemDiagnostics::isSystemHealthy() const {
    return systemHealthy && storageHealthy;
}

String SystemDiagnostics::getSystemStatus() const {
    if (isSystemHealthy()) {
        return "healthy";
    }
    
    String issues = "issues: ";
    if (!systemHealthy) issues += "system ";
    if (!storageHealthy) issues += "storage ";
    return issues;
}

void SystemDiagnostics::updateSystemMetrics() {
    // Update overall system health based on subsystem status
    systemHealthy = isWiFiStable() && isBLEHealthy() && isTogglAPIHealthy() && isStorageHealthy();
}

void SystemDiagnostics::recordLoopTime(unsigned long loopTimeMs) {
    loopTimes[loopTimeIndex] = loopTimeMs;
    loopTimeIndex = (loopTimeIndex + 1) % LOOP_TIME_BUFFER_SIZE;
    
    if (loopTimeMs > maxLoopTime) {
        maxLoopTime = loopTimeMs;
    }
}

unsigned long SystemDiagnostics::getAverageLoopTime() const {
    unsigned long total = 0;
    int count = 0;
    
    for (int i = 0; i < LOOP_TIME_BUFFER_SIZE; i++) {
        if (loopTimes[i] > 0) {
            total += loopTimes[i];
            count++;
        }
    }
    
    return count > 0 ? total / count : 0;
}

unsigned long SystemDiagnostics::getMaxLoopTime() const {
    return maxLoopTime;
}

void SystemDiagnostics::recordWiFiStatus(bool connected, int rssi) {
    if (wifiConnected && !connected) {
        lastWiFiDisconnectTime = millis();
    }
    wifiConnected = connected;
    wifiRSSI = rssi;
}

bool SystemDiagnostics::isWiFiStable() const {
    return wifiConnected;
}

int SystemDiagnostics::getWiFiRSSI() const {
    return wifiRSSI;
}

unsigned long SystemDiagnostics::getLastWiFiDisconnect() const {
    return lastWiFiDisconnectTime;
}

void SystemDiagnostics::recordBLEActivity(bool active, int connections) {
    bleActive = active;
    bleConnections = connections;
    if (active) {
        lastBLEActivityTime = millis();
    }
}

bool SystemDiagnostics::isBLEHealthy() const {
    if (!bleActive) {
        // Consider BLE healthy if it was active recently (within 5 minutes)
        return (millis() - lastBLEActivityTime) < 300000;
    }
    return true;
}

unsigned long SystemDiagnostics::getLastBLEActivity() const {
    return lastBLEActivityTime;
}

void SystemDiagnostics::recordTimerOperation(bool success, const String& operation) {
    apiTotalCount++;
    if (success) {
        apiSuccessCount++;
    } else {
        lastAPIFailureTime = millis();
    }
}

bool SystemDiagnostics::isTogglAPIHealthy() const {
    return getAPISuccessRate() >= 80; // 80% success rate threshold
}

int SystemDiagnostics::getAPISuccessRate() const {
    if (apiTotalCount == 0) {
        return 100; // Optimistic start
    }
    return (apiSuccessCount * 100) / apiTotalCount;
}

unsigned long SystemDiagnostics::getLastAPIFailure() const {
    return lastAPIFailureTime;
}

void SystemDiagnostics::recordStorageOperation(bool success, const String& operation) {
    if (!success) {
        storageHealthy = false;
        lastStorageErrorTime = millis();
    }
}

bool SystemDiagnostics::isStorageHealthy() const {
    return storageHealthy;
}

unsigned long SystemDiagnostics::getLastStorageError() const {
    return lastStorageErrorTime;
}

String SystemDiagnostics::generateDiagnosticsReport() const {
    String report = "{";
    report += "\"uptime\":" + String(millis() - bootTime) + ",";
    report += "\"system_healthy\":" + String(systemHealthy ? "true" : "false") + ",";
    report += "\"wifi_connected\":" + String(wifiConnected ? "true" : "false") + ",";
    report += "\"wifi_rssi\":" + String(wifiRSSI) + ",";
    report += "\"ble_active\":" + String(bleActive ? "true" : "false") + ",";
    report += "\"ble_connections\":" + String(bleConnections) + ",";
    report += "\"api_healthy\":" + String(isTogglAPIHealthy() ? "true" : "false") + ",";
    report += "\"api_success_rate\":" + String(getAPISuccessRate()) + ",";
    report += "\"storage_healthy\":" + String(storageHealthy ? "true" : "false") + ",";
    report += "\"avg_loop_time\":" + String(getAverageLoopTime()) + ",";
    report += "\"max_loop_time\":" + String(maxLoopTime);
    report += "}";
    
    return report;
}