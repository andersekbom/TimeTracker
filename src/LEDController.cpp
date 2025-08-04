#include "LEDController.h"
#include "Config.h"

LEDController::LEDController() : useBuiltinLED(false) {
}

bool LEDController::begin() {
    initializeHardware();
    return true;
}

void LEDController::initializeHardware() {
    // Detect board type and initialize appropriate LED hardware
    if (LED_BUILTIN == 13) {
        Serial.println("Using built-in LED on Nano 33 IoT");
        useBuiltinLED = true;
        pinMode(LED_BUILTIN, OUTPUT);
        digitalWrite(LED_BUILTIN, LOW);
    } else {
        Serial.println("Using RGB LED on Nano RP2040 Connect");
        useBuiltinLED = false;
        #if defined(ARDUINO_ARCH_SAMD) || defined(ARDUINO_NANO33BLE)
        // Initialize WiFiNINA (required for LED control on RP2040)
        WiFiDrv::pinMode(25, OUTPUT); // Green LED
        WiFiDrv::pinMode(26, OUTPUT); // Red LED
        WiFiDrv::pinMode(27, OUTPUT); // Blue LED
        
        // Turn off all LEDs initially
        WiFiDrv::digitalWrite(25, LOW);
        WiFiDrv::digitalWrite(26, LOW);
        WiFiDrv::digitalWrite(27, LOW);
        #endif
    }
}

void LEDController::setColor(uint8_t red, uint8_t green, uint8_t blue) {
    if (useBuiltinLED) {
        // For built-in LED, use brightness based on color intensity
        uint8_t brightness = max(red, max(green, blue));
        setBuiltinLED(brightness);
    } else {
        setRGBLED(red, green, blue);
    }
}

void LEDController::setColorWithIntensity(uint8_t red, uint8_t green, uint8_t blue, int intensity) {
    // Clamp intensity between min and max
    if (intensity < 1) intensity = 1;
    if (intensity > Config::LED_MAX_INTENSITY) intensity = Config::LED_MAX_INTENSITY;

    uint8_t scaledRed = scaleIntensity(red, intensity);
    uint8_t scaledGreen = scaleIntensity(green, intensity);
    uint8_t scaledBlue = scaleIntensity(blue, intensity);

    setColor(scaledRed, scaledGreen, scaledBlue);
}

void LEDController::updateColorForOrientation(Orientation orientation, int intensity) {
    if (useBuiltinLED) {
        // For built-in LED, use blink patterns instead of colors
        int blinkCount = getBlinkCountForOrientation(orientation);
        blinkPattern(blinkCount);
    } else {
        // For RGB LED, use colors as before
        switch (orientation) {
            case FACE_UP:
                setColorWithIntensity(0, 255, 0, intensity); // Green
                break;
            case FACE_DOWN:
                setColorWithIntensity(255, 0, 0, intensity); // Red
                break;
            case LEFT_SIDE:
                setColorWithIntensity(0, 0, 255, intensity); // Blue
                break;
            case RIGHT_SIDE:
                setColorWithIntensity(255, 255, 0, intensity); // Yellow
                break;
            case FRONT_EDGE:
                setColorWithIntensity(128, 0, 128, intensity); // Purple
                break;
            case BACK_EDGE:
                setColorWithIntensity(0, 255, 255, intensity); // Cyan
                break;
            default:
                setColorWithIntensity(255, 255, 255, intensity); // White
                break;
        }
    }
}


void LEDController::showError() {
    // Flash red to indicate error
    for (int i = 0; i < 5; i++) {
        setColor(255, 0, 0); // Red
        delay(200);
        setColor(0, 0, 0); // Off
        delay(200);
    }
}


void LEDController::turnOff() {
    setColor(0, 0, 0);
}

void LEDController::blinkPattern(int blinkCount) {
    if (blinkCount <= 0) return;
    
    // Turn off LED first
    setBuiltinLED(0);
    delay(300); // Brief pause before starting pattern
    
    for (int i = 0; i < blinkCount; i++) {
        setBuiltinLED(255); // On
        delay(200);
        setBuiltinLED(0);   // Off
        delay(200);
    }
    
    // Leave LED off after pattern
    delay(300);
}

int LEDController::getBlinkCountForOrientation(Orientation orientation) {
    switch (orientation) {
        case FACE_UP:      return 1; // 1 blink for face up
        case FACE_DOWN:    return 2; // 2 blinks for face down
        case LEFT_SIDE:    return 3; // 3 blinks for left side
        case RIGHT_SIDE:   return 4; // 4 blinks for right side
        case FRONT_EDGE:   return 5; // 5 blinks for front edge
        case BACK_EDGE:    return 6; // 6 blinks for back edge
        default:           return 0; // No blinks for unknown
    }
}

uint8_t LEDController::scaleIntensity(uint8_t value, int intensity) const {
    return (value * intensity) / Config::LED_MAX_INTENSITY;
}

void LEDController::setBuiltinLED(uint8_t brightness) {
    analogWrite(LED_BUILTIN, 255 - brightness); // Invert for built-in LED
}

void LEDController::setRGBLED(uint8_t red, uint8_t green, uint8_t blue) {
    #if defined(ARDUINO_ARCH_SAMD) || defined(ARDUINO_NANO33BLE)
    // The RGB LED is controlled through the NINA module
    // Convert 0-255 range to PWM values and invert (LED is common anode)
    uint8_t redPWM = 255 - red;
    uint8_t greenPWM = 255 - green;
    uint8_t bluePWM = 255 - blue;

    // Set PWM values for each color channel
    WiFiDrv::analogWrite(26, redPWM);   // Red
    WiFiDrv::analogWrite(25, greenPWM); // Green
    WiFiDrv::analogWrite(27, bluePWM);  // Blue
    #endif
}