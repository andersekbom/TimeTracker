#ifndef SYSTEM_DIAGNOSTICS_H
#define SYSTEM_DIAGNOSTICS_H

#include <Arduino.h>

/**
 * System diagnostics and health monitoring
 */
class SystemDiagnostics {
public:
    SystemDiagnostics();
    
    // System health status
    bool isSystemHealthy() const;
    String getSystemStatus() const;
    void updateSystemMetrics();
    
    // Performance monitoring
    void recordLoopTime(unsigned long loopTimeMs);
    unsigned long getAverageLoopTime() const;
    unsigned long getMaxLoopTime() const;
    
    // Network monitoring
    void recordWiFiStatus(bool connected, int rssi);
    bool isWiFiStable() const;
    int getWiFiRSSI() const;
    unsigned long getLastWiFiDisconnect() const;
    
    // BLE monitoring
    void recordBLEActivity(bool active, int connections);
    bool isBLEHealthy() const;
    unsigned long getLastBLEActivity() const;
    
    // API monitoring
    void recordTimerOperation(bool success, const String& operation);
    bool isTogglAPIHealthy() const;
    int getAPISuccessRate() const;
    unsigned long getLastAPIFailure() const;
    
    // Storage monitoring
    void recordStorageOperation(bool success, const String& operation);
    bool isStorageHealthy() const;
    unsigned long getLastStorageError() const;
    
    // Diagnostics reporting
    String generateDiagnosticsReport() const;

private:
    // Performance metrics
    static const int LOOP_TIME_BUFFER_SIZE = 10;
    unsigned long loopTimes[LOOP_TIME_BUFFER_SIZE];
    int loopTimeIndex;
    unsigned long maxLoopTime;
    
    // Network status
    bool wifiConnected;
    int wifiRSSI;
    unsigned long lastWiFiDisconnectTime;
    
    // BLE status
    bool bleActive;
    int bleConnections;
    unsigned long lastBLEActivityTime;
    
    // API status
    int apiSuccessCount;
    int apiTotalCount;
    unsigned long lastAPIFailureTime;
    
    // Storage status
    bool storageHealthy;
    unsigned long lastStorageErrorTime;
    
    // System status
    unsigned long bootTime;
    bool systemHealthy;
};

#endif // SYSTEM_DIAGNOSTICS_H