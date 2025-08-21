#ifndef BLE_MOCKS_H
#define BLE_MOCKS_H

#include <Arduino.h>

// Mock BLE functions for testing
bool simpleBLEBegin();
void simpleBLEPoll();
bool isConfigComplete();
String getWifiSSID();
String getWifiPassword(); 
String getTogglToken();
String getWorkspaceId();
const int* getProjectIds();
bool hasPendingManagementCommand();
String getPendingManagementCommand();
bool processManagementCommand(const String& command);
void updateEnhancedBLECharacteristics();

#endif // BLE_MOCKS_H