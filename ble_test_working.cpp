#include <Arduino.h>
#include <ArduinoBLE.h>

void setup() {
    Serial.begin(115200);
    
    // Wait for serial connection
    unsigned long timeout = millis() + 3000;
    while (!Serial && millis() < timeout) {
        delay(100);
    }
    
    Serial.println("BLE Test Starting...");
    
    // Try to initialize BLE
    if (!BLE.begin()) {
        Serial.println("ERROR: BLE.begin() failed!");
        while (1) {
            delay(1000);
            Serial.println("BLE init failed - stuck in loop");
        }
    }
    
    Serial.println("BLE initialized successfully!");
    Serial.print("BLE MAC Address: ");
    Serial.println(BLE.address());
    
    // Set device name
    BLE.setLocalName("BLE-Test");
    BLE.setDeviceName("BLE-Test");
    
    // Start advertising
    BLE.advertise();
    Serial.println("BLE advertising started");
    Serial.println("Device should appear as 'BLE-Test' in BLE scanners");
}

void loop() {
    BLE.poll();
    
    static unsigned long lastPrint = 0;
    if (millis() - lastPrint > 5000) {
        Serial.println("BLE running... (should be discoverable)");
        lastPrint = millis();
    }
    
    delay(100);
}