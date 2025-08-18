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
    
    // Animation state for non-blocking LED patterns
    enum LEDAnimationState { IDLE, PULSE, FLASH } currentAnimation;
    unsigned long animationStartTime;
    int animationStep;
    int animationParam1, animationParam2; // For storing animation parameters
    
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
    
    // BLE state-specific LED feedback (non-blocking)
    void showBLESetupMode();      // Blue (RGB) or slow pulse (single LED)
    void showBLEConnecting();     // Yellow (RGB) or fast pulse (single LED)  
    void showBLEConnected();      // Green (RGB) or solid on (single LED)
    void showBLEError();          // Red blink (RGB) or triple flash (single LED)
    void updateBLEAnimation();    // Call in main loop to update animations
    
private:
    void setBuiltinLED(uint8_t brightness);
    void setRGBLED(uint8_t red, uint8_t green, uint8_t blue);
    
    // Helper methods for single LED patterns
    void pulseBuiltinLED(int duration, int pulseCount = 1);
    void flashBuiltinLED(int flashCount, int onTime = 150, int offTime = 150);
};

#endif // LED_CONTROLLER_H