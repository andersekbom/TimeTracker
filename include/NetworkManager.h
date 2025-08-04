#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <Arduino.h>

#if defined(ARDUINO_ARCH_SAMD) || defined(ARDUINO_NANO33BLE)
  #include <WiFiNINA.h>
  #include <WiFiSSLClient.h>
#elif defined(ARDUINO_ARCH_ESP32)
  #include <WiFi.h>
  #include <WiFiClientSecure.h>
#else
  #include <WiFiNINA.h>
  #include <WiFiSSLClient.h>
#endif

class NetworkManager {
public:
    NetworkManager();
    
    bool connectToWiFi();
    bool isConnected();
    void reconnectIfNeeded();
    
private:
    void flashConnectionStatus(bool connecting);
};

#endif // NETWORK_MANAGER_H