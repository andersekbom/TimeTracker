#include "LEDController.h"
#include "Config.h"

LEDController::LEDController() : useBuiltinLED(false), currentAnimation(IDLE), animationStartTime(0), animationStep(0), animationParam1(0), animationParam2(0) {
}

bool LEDController::begin() {
    initializeHardware();
    return true;
}

void LEDController::initializeHardware() {
    // Detect board type and initialize appropriate LED hardware
    #if defined(ARDUINO_NANO_RP2040_CONNECT)
        Serial.println("Using RGB LED on Nano RP2040 Connect");
        useBuiltinLED = false;
        // Initialize WiFiNINA (required for LED control on RP2040)
        WiFiDrv::pinMode(25, OUTPUT); // Green LED
        WiFiDrv::pinMode(26, OUTPUT); // Red LED
        WiFiDrv::pinMode(27, OUTPUT); // Blue LED
        
        // Turn off all LEDs initially
        WiFiDrv::digitalWrite(25, LOW);
        WiFiDrv::digitalWrite(26, LOW);
        WiFiDrv::digitalWrite(27, LOW);
    #else
        Serial.println("Using built-in LED on Nano 33 IoT");
        useBuiltinLED = true;
        pinMode(LED_BUILTIN, OUTPUT);
        digitalWrite(LED_BUILTIN, HIGH); // HIGH = OFF for inverted LED
    #endif
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
    #if defined(ARDUINO_NANO_RP2040_CONNECT)
    // The RGB LED is controlled through the NINA module on RP2040 Connect
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

// BLE state-specific LED feedback methods (non-blocking)
void LEDController::showBLESetupMode() {
    if (useBuiltinLED) {
        // Start slow pulse animation
        currentAnimation = PULSE;
        animationStartTime = millis();
        animationStep = 0;
        animationParam1 = 2000; // 2-second cycle
        animationParam2 = 1;    // Single pulse
    } else {
        // Blue color for RGB LED
        currentAnimation = IDLE;
        setColor(0, 0, 128); // Dim blue
    }
}

void LEDController::showBLEConnecting() {
    if (useBuiltinLED) {
        // Start fast pulse animation
        currentAnimation = PULSE;
        animationStartTime = millis();
        animationStep = 0;
        animationParam1 = 1000; // 1-second cycle
        animationParam2 = 2;    // Double pulse
    } else {
        // Yellow color for RGB LED
        currentAnimation = IDLE;
        setColor(128, 128, 0); // Dim yellow
    }
}

void LEDController::showBLEConnected() {
    if (useBuiltinLED) {
        // Solid on for connected
        currentAnimation = IDLE;
        setBuiltinLED(128); // Medium brightness solid
    } else {
        // Green color for RGB LED
        currentAnimation = IDLE;
        setColor(0, 128, 0); // Dim green
    }
}

void LEDController::showBLEError() {
    if (useBuiltinLED) {
        // Start triple flash animation
        currentAnimation = FLASH;
        animationStartTime = millis();
        animationStep = 0;
        animationParam1 = 3;   // 3 flashes
        animationParam2 = 200; // 200ms on/off time
    } else {
        // Red color for RGB LED (static error indication)
        currentAnimation = IDLE;
        setColor(128, 0, 0); // Dim red
    }
}

void LEDController::showWiFiError() {
    if (useBuiltinLED) {
        // Start WiFi error animation: 2 blinks, wait 1 second, repeat
        currentAnimation = WIFI_ERROR;
        animationStartTime = millis();
        animationStep = 0;
        animationParam1 = 2;    // 2 blinks per cycle
        animationParam2 = 150;  // 150ms on/off time for each blink
    } else {
        // Red color for RGB LED with slight flashing pattern
        currentAnimation = WIFI_ERROR;
        animationStartTime = millis();
        animationStep = 0;
        animationParam1 = 2;    // 2 blinks per cycle
        animationParam2 = 150;  // 150ms on/off time for each blink
        setColor(128, 0, 0); // Start with dim red
    }
}

// Non-blocking animation update method
void LEDController::updateBLEAnimation() {
    if (currentAnimation == IDLE) {
        return; // No animation needed
    }
    
    unsigned long elapsed = millis() - animationStartTime;
    
    switch (currentAnimation) {
        case PULSE: {
            int cycleDuration = animationParam1; // Full cycle time
            int cyclePosition = elapsed % cycleDuration;
            
            // Simple sine-wave approximation for smooth pulse
            if (cyclePosition < cycleDuration / 2) {
                // Fade in
                int brightness = (cyclePosition * 128) / (cycleDuration / 2);
                setBuiltinLED(brightness);
            } else {
                // Fade out
                int brightness = 128 - ((cyclePosition - cycleDuration / 2) * 128) / (cycleDuration / 2);
                setBuiltinLED(brightness);
            }
            break;
        }
        
        case FLASH: {
            int flashDuration = animationParam2; // Time for one flash (on+off)
            int totalFlashes = animationParam1;
            int currentFlash = elapsed / (flashDuration * 2); // Each flash is on+off
            
            if (currentFlash >= totalFlashes) {
                // Animation complete
                setBuiltinLED(0);
                currentAnimation = IDLE;
            } else {
                // Determine if we're in on or off phase of current flash
                int flashPhase = elapsed % (flashDuration * 2);
                if (flashPhase < flashDuration) {
                    setBuiltinLED(255); // On
                } else {
                    setBuiltinLED(0);   // Off
                }
            }
            break;
        }
        
        case WIFI_ERROR: {
            // WiFi error pattern: blink, gap, blink, wait 1 second, repeat
            int blinkOnTime = animationParam2;   // 150ms ON
            int blinkOffTime = animationParam2;  // 150ms OFF
            int gapTime = animationParam2;       // 150ms gap between blinks
            int waitTime = 1000;                 // 1 second wait
            
            // Timing: ON(150) + OFF(150) + ON(150) + OFF(150) + WAIT(1000) = 1600ms total
            int cycleDuration = (blinkOnTime + blinkOffTime) + gapTime + (blinkOnTime + blinkOffTime) + waitTime;
            int cyclePosition = elapsed % cycleDuration;
            
            if (cyclePosition < blinkOnTime) {
                // First blink ON phase
                if (useBuiltinLED) {
                    setBuiltinLED(255);
                } else {
                    setColor(255, 0, 0);
                }
            } else if (cyclePosition < (blinkOnTime + blinkOffTime)) {
                // First blink OFF phase
                if (useBuiltinLED) {
                    setBuiltinLED(0);
                } else {
                    setColor(0, 0, 0);
                }
            } else if (cyclePosition < (blinkOnTime + blinkOffTime + gapTime)) {
                // Gap between blinks (OFF)
                if (useBuiltinLED) {
                    setBuiltinLED(0);
                } else {
                    setColor(0, 0, 0);
                }
            } else if (cyclePosition < (blinkOnTime + blinkOffTime + gapTime + blinkOnTime)) {
                // Second blink ON phase
                if (useBuiltinLED) {
                    setBuiltinLED(255);
                } else {
                    setColor(255, 0, 0);
                }
            } else if (cyclePosition < (blinkOnTime + blinkOffTime + gapTime + blinkOnTime + blinkOffTime)) {
                // Second blink OFF phase
                if (useBuiltinLED) {
                    setBuiltinLED(0);
                } else {
                    setColor(0, 0, 0);
                }
            } else {
                // Wait phase (1 second OFF)
                if (useBuiltinLED) {
                    setBuiltinLED(0);
                } else {
                    setColor(0, 0, 0);
                }
            }
            break;
        }
        
        default:
            currentAnimation = IDLE;
            break;
    }
}

// Helper methods for single LED patterns (kept for compatibility)
void LEDController::pulseBuiltinLED(int duration, int pulseCount) {
    for (int pulse = 0; pulse < pulseCount; pulse++) {
        // Fade in
        for (int brightness = 0; brightness <= 128; brightness += 8) {
            setBuiltinLED(brightness);
            delay(duration / (16 * pulseCount)); // Smooth fade timing
        }
        // Fade out  
        for (int brightness = 128; brightness >= 0; brightness -= 8) {
            setBuiltinLED(brightness);
            delay(duration / (16 * pulseCount)); // Smooth fade timing
        }
        
        if (pulse < pulseCount - 1) {
            delay(200); // Brief pause between pulses
        }
    }
}

void LEDController::flashBuiltinLED(int flashCount, int onTime, int offTime) {
    for (int flash = 0; flash < flashCount; flash++) {
        setBuiltinLED(255); // Full brightness
        delay(onTime);
        setBuiltinLED(0);   // Off
        
        if (flash < flashCount - 1) {
            delay(offTime); // Pause between flashes
        }
    }
    delay(300); // Final pause after pattern
}