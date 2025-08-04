#ifndef ORIENTATION_DETECTOR_H
#define ORIENTATION_DETECTOR_H

#include <Arduino.h>

enum Orientation {
    FACE_UP,
    FACE_DOWN,
    LEFT_SIDE,
    RIGHT_SIDE,
    FRONT_EDGE,
    BACK_EDGE,
    UNKNOWN
};

class OrientationDetector {
private:
    Orientation currentOrientation;
    unsigned long lastOrientationChange;
    float threshold;
    unsigned long debounceTime;

public:
    OrientationDetector(float orientationThreshold = 0.75f, unsigned long debounceMs = 5000);
    
    bool begin();
    Orientation detectOrientation(float accelX, float accelY, float accelZ);
    bool hasOrientationChanged(Orientation newOrientation);
    void updateOrientation(Orientation newOrientation);
    
    Orientation getCurrentOrientation() const { return currentOrientation; }
    String getOrientationName(Orientation orientation) const;
    String getCurrentOrientationName() const;
    
    void printOrientation(Orientation orientation, float x, float y, float z) const;
    void setThreshold(float newThreshold) { threshold = newThreshold; }
    void setDebounceTime(unsigned long newDebounceMs) { debounceTime = newDebounceMs; }

private:
    Orientation determineOrientation(float x, float y, float z) const;
};

#endif // ORIENTATION_DETECTOR_H