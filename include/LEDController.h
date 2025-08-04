#ifndef LED_CONTROLLER_H
#define LED_CONTROLLER_H

#include <Arduino.h>
#include "OrientationDetector.h"

#if defined(ARDUINO_ARCH_SAMD) || defined(ARDUINO_NANO33BLE)
  #include <WiFiNINA.h>
#endif

class LEDController {
private:
    bool useBuiltinLED;
    
    void initializeHardware();
    uint8_t scaleIntensity(uint8_t value, int intensity) const;
    void blinkPattern(int blinkCount);
    int getBlinkCountForOrientation(Orientation orientation);

public:
    LEDController();
    
    bool begin();
    void setColor(uint8_t red, uint8_t green, uint8_t blue);
    void setColorWithIntensity(uint8_t red, uint8_t green, uint8_t blue, int intensity);
    void updateColorForOrientation(Orientation orientation, int intensity = 100);
    
    void showError();
    void turnOff();
    
private:
    void setBuiltinLED(uint8_t brightness);
    void setRGBLED(uint8_t red, uint8_t green, uint8_t blue);
};

#endif // LED_CONTROLLER_H