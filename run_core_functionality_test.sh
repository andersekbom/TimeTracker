#!/bin/bash

echo "========================================"
echo "  TimeTracker Core Functionality Test"
echo "========================================"
echo ""
echo "This test verifies that orientation detection and Toggl API"
echo "communication remain stable during BLE system changes."
echo ""
echo "What this test checks:"
echo "✓ IMU initialization and data reading"
echo "✓ WiFi connectivity" 
echo "✓ Orientation detection accuracy and stability"
echo "✓ Toggl API authentication and basic operations"
echo "✓ Integrated workflow (orientation -> Toggl timer)"
echo "✓ System stability and memory usage"
echo ""

# Check which device to test
if [ -f "/dev/ttyACM0" ]; then
    DEVICE="/dev/ttyACM0"
elif [ -f "/dev/ttyACM1" ]; then
    DEVICE="/dev/ttyACM1"
elif [ -f "/dev/ttyACM2" ]; then
    DEVICE="/dev/ttyACM2"
else
    echo "❌ No Arduino device found on /dev/ttyACM*"
    echo "Please connect your TimeTracker device."
    exit 1
fi

echo "Device detected: $DEVICE"
echo ""

# Determine which test environment to use
read -p "Which board are you testing? (1=Nano 33 IoT, 2=Nano RP2040): " BOARD_CHOICE

case $BOARD_CHOICE in
    1)
        TEST_ENV="nano_33_iot_test"
        echo "Using Nano 33 IoT test environment"
        ;;
    2)
        TEST_ENV="nanorp2040connect_test"
        echo "Using Nano RP2040 Connect test environment"
        ;;
    *)
        echo "Invalid choice. Using Nano 33 IoT test environment as default"
        TEST_ENV="nano_33_iot_test"
        ;;
esac

echo ""
echo "Building and uploading test firmware..."
echo "----------------------------------------"

# Build and upload the test
if /home/anders/.platformio/penv/bin/pio run --target upload -e $TEST_ENV; then
    echo ""
    echo "✅ Test firmware uploaded successfully!"
    echo ""
    echo "📋 TEST INSTRUCTIONS:"
    echo "1. The test will run automatically for about 45 seconds"
    echo "2. During the 'Orientation Detection' test, try different orientations"
    echo "3. During the 'Integrated Workflow' test, change orientations to test full workflow"
    echo "4. Watch the serial output for test results"
    echo ""
    echo "Starting serial monitor..."
    echo "Press Ctrl+C to stop monitoring"
    echo ""
    echo "=========================================="
    
    # Monitor the test output
    /home/anders/.platformio/penv/bin/pio device monitor --port $DEVICE --baud 115200
    
else
    echo ""
    echo "❌ Failed to upload test firmware"
    echo "Please check:"
    echo "- Device is connected properly"
    echo "- No other programs are using the serial port"
    echo "- Board selection is correct"
    exit 1
fi

echo ""
echo "Test completed. Check the output above for results."
echo "All tests should show PASS for a healthy system."