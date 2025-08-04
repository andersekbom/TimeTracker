#include "OrientationDetector.h"
#include "WiFiCredentials.h"

#if defined(ARDUINO_ARCH_SAMD) || defined(ARDUINO_NANO33BLE)
  #include <Arduino_LSM6DSOX.h>
#elif defined(ARDUINO_ARCH_ESP32)
  #include <LSM6DS3.h>
#else
  #include <Arduino_LSM6DSOX.h>
#endif

OrientationDetector::OrientationDetector(float orientationThreshold, unsigned long debounceMs) 
    : currentOrientation(UNKNOWN), lastOrientationChange(0), 
      threshold(orientationThreshold), debounceTime(debounceMs) {
}

bool OrientationDetector::begin() {
    if (!IMU.begin()) {
        Serial.println("Failed to initialize IMU!");
        return false;
    }
    Serial.println("IMU initialized successfully");
    return true;
}

Orientation OrientationDetector::detectOrientation(float accelX, float accelY, float accelZ) {
    return determineOrientation(accelX, accelY, accelZ);
}

Orientation OrientationDetector::determineOrientation(float x, float y, float z) const {
    // Z-axis: Face up/down
    if (z > threshold) {
        return FACE_UP;
    } else if (z < -threshold) {
        return FACE_DOWN;
    }

    // X-axis: Left/right side
    if (x > threshold) {
        return RIGHT_SIDE;
    } else if (x < -threshold) {
        return LEFT_SIDE;
    }

    // Y-axis: Front/back edge
    if (y > threshold) {
        return FRONT_EDGE;
    } else if (y < -threshold) {
        return BACK_EDGE;
    }

    return UNKNOWN;
}

bool OrientationDetector::hasOrientationChanged(Orientation newOrientation) {
    return (newOrientation != currentOrientation && 
            millis() - lastOrientationChange > debounceTime);
}

void OrientationDetector::updateOrientation(Orientation newOrientation) {
    currentOrientation = newOrientation;
    lastOrientationChange = millis();
}

String OrientationDetector::getOrientationName(Orientation orientation) const {
    if (orientation >= FACE_UP && orientation <= BACK_EDGE) {
        return String(projectNames[orientation]);
    }
    return "Unknown";
}

String OrientationDetector::getCurrentOrientationName() const {
    return getOrientationName(currentOrientation);
}

void OrientationDetector::printOrientation(Orientation orientation, float x, float y, float z) const {
    Serial.print("Orientation: ");
    Serial.println(getOrientationName(orientation));

    // Print raw acceleration values for debugging
    Serial.print("Accel X: ");
    Serial.print(x);
    Serial.print(", Y: ");
    Serial.print(y);
    Serial.print(", Z: ");
    Serial.println(z);
    Serial.println();
}