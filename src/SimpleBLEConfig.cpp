#include <Arduino.h>
#include <ArduinoBLE.h>

// Base64 decoding lookup table
static const char base64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Base64 decoding function
String base64Decode(const String& encoded) {
    String decoded = "";
    int val = 0, valb = -8;
    
    for (unsigned int i = 0; i < encoded.length(); i++) {
        char c = encoded[i];
        if (c == '=') break; // Padding character
        
        const char* pos = strchr(base64_chars, c);
        if (pos == nullptr) continue; // Invalid character
        
        val = (val << 6) + (pos - base64_chars);
        valb += 6;
        if (valb >= 0) {
            decoded += char((val >> valb) & 0xFF);
            valb -= 8;
        }
    }
    return decoded;
}

// Simple BLE configuration without complex constructors
// Using global variables to avoid constructor issues

// Service and characteristics - declared but not initialized until begin()
BLEService* configService = nullptr;
BLEStringCharacteristic* wifiSSIDChar = nullptr;  
BLEStringCharacteristic* wifiPasswordChar = nullptr;
BLEStringCharacteristic* togglTokenChar = nullptr;
BLEStringCharacteristic* workspaceIdChar = nullptr;
BLECharacteristic* projectIdsChar = nullptr;
BLEStringCharacteristic* statusChar = nullptr;
BLEStringCharacteristic* authChallengeChar = nullptr;
BLECharacteristic* authResponseChar = nullptr;

// Configuration data storage
String receivedSSID = "";
String receivedPassword = "";
String receivedToken = "";
String receivedWorkspace = "";
int receivedProjectIds[6] = {0, 0, 0, 0, 0, 0};
bool configComplete = false;
bool projectIdsReceived = false;

// BLE initialization state
bool bleInitialized = false;
String deviceName = "";

// Authentication state
bool isAuthenticated = false;
uint8_t currentChallenge[16] = {0};
const uint8_t deviceSecret[16] = {0x54, 0x69, 0x6d, 0x65, 0x54, 0x72, 0x61, 0x63, 0x6b, 0x65, 0x72, 0x32, 0x30, 0x32, 0x35, 0x00}; // "TimeTracker2025"

// Forward declaration
void checkConfigComplete();

// Forward declaration of test function
void testAuthCallbackSetup();

// Simple base64 encoder for binary response transmission
String base64EncodeBinary(const uint8_t* data, size_t length) {
    const char base64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    String encoded = "";
    size_t i = 0;
    unsigned char char_array_3[3];
    unsigned char char_array_4[4];

    while (i < length) {
        char_array_3[0] = data[i++];
        char_array_3[1] = (i < length) ? data[i++] : 0;
        char_array_3[2] = (i < length) ? data[i++] : 0;

        char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
        char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
        char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
        char_array_4[3] = char_array_3[2] & 0x3f;

        for (int j = 0; j < 4; j++) {
            encoded += base64_chars[char_array_4[j]];
        }
    }

    // Add padding
    while (encoded.length() % 4) {
        encoded += '=';
    }

    return encoded;
}

// Simple base64 decoder for challenge data
int base64DecodeBinary(const String& encoded, uint8_t* output, size_t maxOutputLen) {
    const char base64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    int in_len = encoded.length();
    int i = 0;
    int in = 0;
    unsigned char char_array_4[4], char_array_3[3];
    size_t outputIndex = 0;

    while (in_len-- && (encoded[in] != '=') && outputIndex < maxOutputLen) {
        // Find character in base64 alphabet
        char c = encoded[in];
        int pos = -1;
        for (int j = 0; j < 64; j++) {
            if (base64_chars[j] == c) {
                pos = j;
                break;
            }
        }
        if (pos == -1) break; // Invalid character
        
        char_array_4[i++] = pos;
        in++;
        
        if (i == 4) {
            char_array_3[0] = (char_array_4[0] << 2) + ((char_array_4[1] & 0x30) >> 4);
            char_array_3[1] = ((char_array_4[1] & 0xf) << 4) + ((char_array_4[2] & 0x3c) >> 2);
            char_array_3[2] = ((char_array_4[2] & 0x3) << 6) + char_array_4[3];

            for (i = 0; i < 3 && outputIndex < maxOutputLen; i++) {
                output[outputIndex++] = char_array_3[i];
            }
            i = 0;
        }
    }

    if (i && outputIndex < maxOutputLen) {
        for (int j = 0; j < i; j++) {
            char_array_4[j] = char_array_4[j];
        }
        for (int j = i; j < 4; j++) {
            char_array_4[j] = 0;
        }

        char_array_3[0] = (char_array_4[0] << 2) + ((char_array_4[1] & 0x30) >> 4);
        char_array_3[1] = ((char_array_4[1] & 0xf) << 4) + ((char_array_4[2] & 0x3c) >> 2);

        for (int j = 0; j < i - 1 && outputIndex < maxOutputLen; j++) {
            output[outputIndex++] = char_array_3[j];
        }
    }

    return (int)outputIndex;
}

// Simple authentication response generation (XOR-based for simplicity)
void generateAuthResponse(const uint8_t* challenge, uint8_t* response) {
    for (int i = 0; i < 16; i++) {
        response[i] = challenge[i] ^ deviceSecret[i] ^ ((i * 7) & 0xFF); // Add position-based salt
    }
}

// UUIDs
#define TIMETRACKER_SERVICE_UUID "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
#define WIFI_SSID_CHAR_UUID     "6ba7b811-9dad-11d1-80b4-00c04fd430c8"
#define WIFI_PASSWORD_CHAR_UUID "6ba7b812-9dad-11d1-80b4-00c04fd430c8"
#define TOGGL_TOKEN_CHAR_UUID   "6ba7b813-9dad-11d1-80b4-00c04fd430c8"
#define WORKSPACE_ID_CHAR_UUID  "6ba7b814-9dad-11d1-80b4-00c04fd430c8"
#define PROJECT_IDS_CHAR_UUID   "6ba7b815-9dad-11d1-80b4-00c04fd430c8"
#define STATUS_CHAR_UUID        "6ba7b816-9dad-11d1-80b4-00c04fd430c8"
#define AUTH_CHALLENGE_CHAR_UUID "6ba7b817-9dad-11d1-80b4-00c04fd430c8"
#define AUTH_RESPONSE_CHAR_UUID  "6ba7b818-9dad-11d1-80b4-00c04fd430c8"

// Callback functions
void onWifiSSIDWritten(BLEDevice central, BLECharacteristic characteristic) {
    int length = characteristic.valueLength();
    if (length > 0 && length < 128) { // Allow more space for base64 encoded data
        const uint8_t* data = characteristic.value();
        String base64Data = "";
        for (int i = 0; i < length; i++) {
            base64Data += (char)data[i];
        }
        
        // Debug: Print hex dump of received data
        Serial.print("Raw BLE data (");
        Serial.print(length);
        Serial.print(" bytes): ");
        for (int i = 0; i < length; i++) {
            if (data[i] < 16) Serial.print("0");
            Serial.print(data[i], HEX);
            Serial.print(" ");
        }
        Serial.println();
        
        Serial.print("Raw string received: '");
        Serial.print(base64Data);
        Serial.println("'");
        
        // Use the raw string directly - no Base64 decoding needed
        receivedSSID = base64Data;
        Serial.print("Final SSID: '");
        Serial.print(receivedSSID);
        Serial.println("'");
        Serial.print("WiFi SSID received (base64 length: ");
        Serial.print(base64Data.length());
        Serial.print(", decoded length: ");
        Serial.print(receivedSSID.length());
        Serial.print("): '");
        Serial.print(receivedSSID);
        Serial.println("'");
        
        // Store the value for later reading
        if (wifiSSIDChar) {
            wifiSSIDChar->writeValue(base64Data);
        }
        
        // Update status
        if (statusChar) {
            statusChar->writeValue("ssid_received");
        }
        
        // Check if configuration is now complete
        checkConfigComplete();
    } else {
        Serial.print("Invalid WiFi SSID length: ");
        Serial.println(length);
    }
}

void onWifiPasswordWritten(BLEDevice central, BLECharacteristic characteristic) {
    int length = characteristic.valueLength();
    if (length > 0 && length < 128) { // Allow more space for base64 encoded data
        const uint8_t* data = characteristic.value();
        String base64Data = "";
        for (int i = 0; i < length; i++) {
            base64Data += (char)data[i];
        }
        
        // Use raw string directly - no Base64 decoding needed
        receivedPassword = base64Data;
        Serial.print("WiFi password received (base64 length: ");
        Serial.print(base64Data.length());
        Serial.print(", decoded length: ");
        Serial.print(receivedPassword.length());
        Serial.println(") - content hidden for security");
        
        // Store the value for later reading
        if (wifiPasswordChar) {
            wifiPasswordChar->writeValue(base64Data);
        }
        
        // Update status
        if (statusChar) {
            statusChar->writeValue("password_received");
        }
    }
}

void onTogglTokenWritten(BLEDevice central, BLECharacteristic characteristic) {
    int length = characteristic.valueLength();
    Serial.print("Toggl token BLE data received - length: ");
    Serial.println(length);
    
    if (length > 0 && length < 512) { // Allow more space for base64 encoded data
        const uint8_t* data = characteristic.value();
        String base64Data = "";
        for (int i = 0; i < length; i++) {
            base64Data += (char)data[i];
        }
        
        // Use raw string directly - no Base64 decoding needed
        receivedToken = base64Data;
        Serial.print("Toggl token received (base64 length: ");
        Serial.print(base64Data.length());
        Serial.print(", decoded length: ");
        Serial.print(receivedToken.length());
        Serial.println(") - content hidden for security");
        
        // Store the value for later reading
        if (togglTokenChar) {
            togglTokenChar->writeValue(base64Data);
        }
        
        // Update status
        if (statusChar) {
            statusChar->writeValue("token_received");
        }
        
        // Don't check completion here - wait for all data
    } else {
        Serial.print("Invalid Toggl token length - expected 1-511, got: ");
        Serial.println(length);
    }
}

void onWorkspaceIdWritten(BLEDevice central, BLECharacteristic characteristic) {
    int length = characteristic.valueLength();
    if (length > 0 && length < 32) { // Allow more space for base64 encoded data
        const uint8_t* data = characteristic.value();
        String base64Data = "";
        for (int i = 0; i < length; i++) {
            base64Data += (char)data[i];
        }
        
        // Use raw string directly - no Base64 decoding needed
        receivedWorkspace = base64Data;
        Serial.print("Workspace ID received (base64 length: ");
        Serial.print(base64Data.length());
        Serial.print(", decoded length: ");
        Serial.print(receivedWorkspace.length());
        Serial.print("): ");
        Serial.println(receivedWorkspace);
        
        // Store the value for later reading
        if (workspaceIdChar) {
            workspaceIdChar->writeValue(base64Data);
        }
        
        // Update status
        if (statusChar) {
            statusChar->writeValue("workspace_received");
        }
        
        // Don't check completion here - wait for project IDs
    }
}

void onProjectIdsWritten(BLEDevice central, BLECharacteristic characteristic) {
    const uint8_t* data = characteristic.value();
    int dataLength = characteristic.valueLength();
    
    Serial.print("Project IDs data received: ");
    Serial.print(dataLength);
    Serial.println(" bytes");
    
    if (dataLength == 24) { // 6 integers * 4 bytes each
        // Convert byte array to integers (little endian)
        for (int i = 0; i < 6; i++) {
            receivedProjectIds[i] = (data[i*4]) | 
                                   (data[i*4 + 1] << 8) | 
                                   (data[i*4 + 2] << 16) | 
                                   (data[i*4 + 3] << 24);
        }
        Serial.println("Project IDs parsed successfully:");
        for (int i = 0; i < 6; i++) {
            Serial.print("  Orientation[" + String(i) + "]: ");
            Serial.println(receivedProjectIds[i]);
        }
        
        // Mark project IDs as received
        projectIdsReceived = true;
        
        // Store the value for later reading
        if (projectIdsChar) {
            projectIdsChar->writeValue(data, dataLength);
        }
        
        // Update status
        if (statusChar) {
            statusChar->writeValue("projects_received");
        }
        
        checkConfigComplete();
    } else {
        Serial.print("Invalid project IDs data length - expected 24 bytes, got ");
        Serial.println(dataLength);
    }
}

void onAuthChallengeWritten(BLEDevice central, BLECharacteristic characteristic) {
    Serial.println("=== AUTHENTICATION CHALLENGE CALLBACK TRIGGERED ===");
    Serial.print("Timestamp: ");
    Serial.println(millis());
    Serial.print("Central address: ");
    Serial.println(central.address());
    Serial.print("Characteristic UUID: ");
    Serial.println(characteristic.uuid());
    
    // Get the base64 string from the characteristic
    const uint8_t* rawData = characteristic.value();
    int dataLength = characteristic.valueLength();
    
    Serial.print("Raw data length: ");
    Serial.println(dataLength);
    Serial.print("Raw data (hex): ");
    for (int i = 0; i < dataLength; i++) {
        if (rawData[i] < 16) Serial.print("0");
        Serial.print(rawData[i], HEX);
        Serial.print(" ");
    }
    Serial.println();
    
    String base64Data = "";
    for (int i = 0; i < dataLength; i++) {
        base64Data += (char)rawData[i];
    }
    Serial.println("Challenge base64: " + base64Data);
    Serial.print("Base64 length: ");
    Serial.println(base64Data.length());
    
    // Handle raw binary challenge data (mobile app sends 16 bytes directly)
    uint8_t challenge[16];
    int challengeLength = dataLength;
    
    if (challengeLength == 16) {
        // Copy raw binary data directly
        for (int i = 0; i < 16; i++) {
            challenge[i] = rawData[i];
        }
        Serial.println("Using raw binary challenge data");
    } else {
        // Fallback: try base64 decoding if not 16 bytes
        Serial.println("Attempting base64 decode...");
        challengeLength = base64DecodeBinary(base64Data, challenge, 16);
    }
    
    Serial.print("Final challenge length: ");
    Serial.println(challengeLength);
    Serial.print("Challenge (hex): ");
    for (int i = 0; i < challengeLength; i++) {
        if (challenge[i] < 16) Serial.print("0");
        Serial.print(challenge[i], HEX);
        Serial.print(" ");
    }
    Serial.println();
    
    if (challengeLength == 16) {
        
        // Store challenge and generate response
        memcpy(currentChallenge, challenge, 16);
        
        uint8_t response[16];
        generateAuthResponse(challenge, response);
        
        Serial.print("Generated response (hex): ");
        for (int i = 0; i < 16; i++) {
            if (response[i] < 16) Serial.print("0");
            Serial.print(response[i], HEX);
            Serial.print(" ");
        }
        Serial.println();
        
        // Send response as raw binary (same as challenge format)
        Serial.print("Generated response (hex): ");
        for (int i = 0; i < 16; i++) {
            if (response[i] < 16) Serial.print("0");
            Serial.print(response[i], HEX);
            Serial.print(" ");
        }
        Serial.println();
        Serial.println("Sending response as raw binary data");
        
        // Send response via notification as raw binary
        if (authResponseChar) {
            // For notifications, we write the raw binary value
            Serial.println("Writing raw binary response to characteristic for notification...");
            bool writeSuccess = authResponseChar->writeValue(response, 16);
            Serial.print("Write result: ");
            Serial.println(writeSuccess ? "SUCCESS" : "FAILED");
            Serial.println("=== AUTHENTICATION RESPONSE SENT VIA NOTIFICATION ===");
            
            // Mark as authenticated for this session
            isAuthenticated = true;
            
            if (statusChar) {
                statusChar->writeValue("authenticated");
            }
        } else {
            Serial.println("ERROR: authResponseChar is NULL!");
        }
    } else {
        Serial.print("Invalid decoded challenge length - expected 16 bytes, got ");
        Serial.println(challengeLength);
        isAuthenticated = false;
        
        if (statusChar) {
            statusChar->writeValue("auth_failed");
        }
    }
    
    Serial.println("=== AUTHENTICATION CALLBACK COMPLETE ===");
}

void checkConfigComplete() {
    // Check if we have ALL required configuration (WiFi + Toggl token + workspace ID + project IDs)
    if (receivedSSID.length() > 0 && receivedPassword.length() > 0 && 
        receivedToken.length() > 0 && receivedWorkspace.length() > 0 && projectIdsReceived) {
        configComplete = true;
        Serial.println("FULL configuration complete! Ready to test WiFi connection.");
        if (statusChar) {
            statusChar->writeValue("config_complete");
        }
    } else {
        Serial.print("Configuration progress: SSID=");
        Serial.print(receivedSSID.length() > 0 ? "✓" : "✗");
        Serial.print(" Password=");
        Serial.print(receivedPassword.length() > 0 ? "✓" : "✗");
        Serial.print(" Token=");
        Serial.print(receivedToken.length() > 0 ? "✓" : "✗");
        Serial.print(" Workspace=");
        Serial.print(receivedWorkspace.length() > 0 ? "✓" : "✗");
        Serial.print(" Projects=");
        Serial.println(projectIdsReceived ? "✓" : "✗");
    }
}

bool simpleBLEBegin() {
    Serial.println("Starting Simple BLE Configuration Service...");
    
    // Check if already initialized
    if (bleInitialized) {
        Serial.println("BLE already initialized, restarting advertising...");
        Serial.print("Current stored device name: ");
        Serial.println(deviceName.length() > 0 ? deviceName : "EMPTY");
        
        // Stop and restart advertising with preserved device name
        BLE.stopAdvertise();
        delay(100);
        
        // Restore device name
        if (deviceName.length() > 0) {
            BLE.setDeviceName(deviceName.c_str());
            BLE.setLocalName(deviceName.c_str());
            Serial.println("Restored device name: " + deviceName);
        } else {
            Serial.println("WARNING: No stored device name to restore!");
        }
        
        // Restart advertising
        BLE.advertise();
        Serial.println("BLE advertising restarted");
        return true;
    }
    
    // First-time initialization
    if (!BLE.begin()) {
        Serial.println("ERROR: BLE.begin() failed!");
        return false;
    }
    
    Serial.println("BLE initialized successfully");
    
    // Create service and characteristics (only once)
    configService = new BLEService(TIMETRACKER_SERVICE_UUID);
    wifiSSIDChar = new BLEStringCharacteristic(WIFI_SSID_CHAR_UUID, BLERead | BLEWrite, 128); // Increased for base64
    wifiPasswordChar = new BLEStringCharacteristic(WIFI_PASSWORD_CHAR_UUID, BLERead | BLEWrite, 128); // Increased for base64
    togglTokenChar = new BLEStringCharacteristic(TOGGL_TOKEN_CHAR_UUID, BLERead | BLEWrite, 512); // Increased for base64
    workspaceIdChar = new BLEStringCharacteristic(WORKSPACE_ID_CHAR_UUID, BLERead | BLEWrite, 32); // Increased for base64
    projectIdsChar = new BLECharacteristic(PROJECT_IDS_CHAR_UUID, BLERead | BLEWrite, 24); // 6 integers * 4 bytes
    statusChar = new BLEStringCharacteristic(STATUS_CHAR_UUID, BLERead | BLENotify, 32);
    authChallengeChar = new BLEStringCharacteristic(AUTH_CHALLENGE_CHAR_UUID, BLERead | BLEWrite | BLEWriteWithoutResponse, 32); // base64 challenge string
    authResponseChar = new BLECharacteristic(AUTH_RESPONSE_CHAR_UUID, BLERead | BLENotify, 16); // raw binary response
    
    Serial.println("Authentication characteristics created:");
    Serial.println("  Challenge UUID: " AUTH_CHALLENGE_CHAR_UUID);
    Serial.println("  Response UUID: " AUTH_RESPONSE_CHAR_UUID);
    
    // Set device name and store it
    String macAddress = BLE.address();
    String last4 = macAddress.substring(macAddress.length() - 5);
    last4.replace(":", "");
    deviceName = "TimeTracker-" + last4;
    
    BLE.setDeviceName(deviceName.c_str());
    BLE.setLocalName(deviceName.c_str());
    
    // Set initial status
    statusChar->writeValue("setup_mode");
    
    // Set event handlers
    wifiSSIDChar->setEventHandler(BLEWritten, onWifiSSIDWritten);
    wifiPasswordChar->setEventHandler(BLEWritten, onWifiPasswordWritten);
    togglTokenChar->setEventHandler(BLEWritten, onTogglTokenWritten);
    workspaceIdChar->setEventHandler(BLEWritten, onWorkspaceIdWritten);
    projectIdsChar->setEventHandler(BLEWritten, onProjectIdsWritten);
    
    // Set authentication handler
    authChallengeChar->setEventHandler(BLEWritten, onAuthChallengeWritten);
    
    // Add characteristics to service
    configService->addCharacteristic(*wifiSSIDChar);
    configService->addCharacteristic(*wifiPasswordChar);
    configService->addCharacteristic(*togglTokenChar);
    configService->addCharacteristic(*workspaceIdChar);
    configService->addCharacteristic(*projectIdsChar);
    configService->addCharacteristic(*statusChar);
    configService->addCharacteristic(*authChallengeChar);
    configService->addCharacteristic(*authResponseChar);
    
    // Add service to BLE
    BLE.addService(*configService);
    BLE.setAdvertisedService(*configService);
    
    // Start advertising
    BLE.advertise();
    
    // Mark as initialized
    bleInitialized = true;
    
    Serial.println("TimeTracker BLE service started");
    Serial.println("Device name: " + deviceName);
    Serial.println("Ready for configuration via TimeTrackerConfigApp");
    
    // Test callback setup
    testAuthCallbackSetup();
    
    return true;
}

void simpleBLEPoll() {
    static bool wasConnected = false;
    static unsigned long lastPollTime = 0;
    static unsigned long pollCount = 0;
    
    bool isCurrentlyConnected = BLE.connected();
    
    // Poll BLE - this is CRITICAL for callbacks to work
    BLE.poll();
    
    // Debug: Track polling frequency
    pollCount++;
    if (millis() - lastPollTime > 5000) { // Every 5 seconds
        Serial.print("BLE Poll stats - Count: ");
        Serial.print(pollCount);
        Serial.print(", Connected: ");
        Serial.print(isCurrentlyConnected ? "YES" : "NO");
        if (isCurrentlyConnected && BLE.central()) {
            Serial.print(", Central: ");
            Serial.print(BLE.central().address());
        }
        Serial.println();
        lastPollTime = millis();
        pollCount = 0;
    }
    
    // Detect connection events
    if (!wasConnected && isCurrentlyConnected) {
        Serial.println("=== BLE CLIENT CONNECTED ===");
        if (BLE.central()) {
            Serial.print("Central address: ");
            Serial.println(BLE.central().address());
        }
        Serial.println("Ready to receive authentication challenge...");
    }
    
    // Detect disconnect event and restore device name
    if (wasConnected && !isCurrentlyConnected) {
        Serial.println("BLE client disconnected - restoring device name...");
        
        if (deviceName.length() > 0) {
            BLE.setDeviceName(deviceName.c_str());
            BLE.setLocalName(deviceName.c_str());
            Serial.println("Device name restored after disconnect: " + deviceName);
        } else {
            Serial.println("WARNING: No device name to restore after disconnect!");
        }
        
        // Small delay to ensure disconnect is fully processed
        delay(100);
        
        // Restart advertising to make device discoverable again
        Serial.println("Restarting BLE advertising after disconnect...");
        BLE.advertise();
        Serial.println("Device is now advertising and discoverable again");
    }
    
    wasConnected = isCurrentlyConnected;
}

bool isConfigComplete() {
    return configComplete;
}

String getWifiSSID() {
    return receivedSSID;
}

String getWifiPassword() {
    return receivedPassword;
}

String getTogglToken() {
    return receivedToken;
}

String getWorkspaceId() {
    return receivedWorkspace;
}

const int* getProjectIds() {
    return receivedProjectIds;
}

extern "C" void updateBLEStatus(const char* status) {
    if (statusChar) {
        statusChar->writeValue(status);
    }
}

// Make test function externally callable
void testAuthCallbackSetup() {
    Serial.println("=== TESTING AUTH CALLBACK SETUP ===");
    Serial.print("authChallengeChar pointer: ");
    Serial.println(authChallengeChar ? "VALID" : "NULL");
    if (authChallengeChar) {
        Serial.print("Characteristic UUID: ");
        Serial.println(authChallengeChar->uuid());
        Serial.print("Properties: ");
        Serial.println(authChallengeChar->properties(), BIN);
        Serial.print("Value length: ");
        Serial.println(authChallengeChar->valueLength());
    }
    Serial.println("=== END CALLBACK TEST ===");
}