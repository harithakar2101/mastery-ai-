/*
 * Mastery.ai – Inclusive Assistive Hub
 * ESP32 Wearable Firmware Example
 * Supports: BLIND, DEAF, NON_SPEAKING accessibility modes
 * Features: Wi-Fi connection, HTTPS event delivery, Button debouncing,
 *           Tactile haptic vibration, RGB LED status, and SSD1306 OLED display.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// --- Configuration ---
const char* WIFI_SSID     = "YOUR_CAMPUS_WIFI";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Mastery.ai Backend API
const char* API_EVENT_URL = "https://mastery.ai/api/inclusive/events";
const char* DEVICE_ID     = "ESP32-03";
const char* DEVICE_TOKEN  = "dev_token_esp32_03";
const char* ACCESSIBILITY_MODE = "NON_SPEAKING"; // "BLIND", "DEAF", or "NON_SPEAKING"

// --- GPIO Pinout ---
#define PIN_BUTTON_HELP   18 // "I Need Help" Button
#define PIN_BUTTON_BREAK  19 // "I Need a Break" Button
#define PIN_BUTTON_CANCEL 21 // "Cancel / Reset" Button
#define PIN_VIBRATION     22 // Haptic Vibration Motor (PWM or Digital)
#define PIN_LED_RED       25 // RGB LED Red
#define PIN_LED_GREEN     26 // RGB LED Green
#define PIN_LED_BLUE      27 // RGB LED Blue

// Vibration Pattern Timing (from shared wearable_config.json)
void playVibration(const int pulses[], int length) {
  for (int i = 0; i < length; i++) {
    digitalWrite(PIN_VIBRATION, (i % 2 == 0) ? HIGH : LOW);
    delay(pulses[i]);
  }
  digitalWrite(PIN_VIBRATION, LOW);
}

void setRgbLed(uint8_t r, uint8_t g, uint8_t b) {
  analogWrite(PIN_LED_RED, r);
  analogWrite(PIN_LED_GREEN, g);
  analogWrite(PIN_LED_BLUE, b);
}

// Generate simple UUIDv4 for event idempotency
String generateUUID() {
  uint32_t r1 = esp_random();
  uint32_t r2 = esp_random();
  uint32_t r3 = esp_random();
  uint32_t r4 = esp_random();
  char uuid[37];
  snprintf(uuid, sizeof(uuid), "%08x-%04x-4%03x-%04x-%04x%08x",
           r1, (r2 >> 16) & 0xffff, r2 & 0x0fff,
           ((r3 >> 16) & 0x3fff) | 0x8000, r3 & 0xffff, r4);
  return String(uuid);
}

bool sendWearableEvent(const char* requestType) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] Wi-Fi Disconnected!");
    const int errPulse[] = {80, 50, 80, 50, 80, 50, 80};
    playVibration(errPulse, 7);
    setRgbLed(255, 0, 0); // Red LED for error
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure(); // In production, provide root CA cert
  HTTPClient https;

  if (!https.begin(client, API_EVENT_URL)) {
    Serial.println("[ERROR] Unable to connect to Mastery.ai endpoint");
    return false;
  }

  https.addHeader("Content-Type", "application/json");
  https.addHeader("x-device-token", DEVICE_TOKEN);

  StaticJsonDocument<384> doc;
  doc["event_id"] = generateUUID();
  doc["device_id"] = DEVICE_ID;
  doc["event_type"] = "HELP_REQUEST";
  doc["request"] = requestType;
  doc["accessibility_mode"] = ACCESSIBILITY_MODE;
  doc["source"] = "hardware";

  String requestJson;
  serializeJson(doc, requestJson);

  Serial.print("[HTTP] Dispatching event: ");
  Serial.println(requestJson);

  int httpCode = https.POST(requestJson);

  if (httpCode == 201 || httpCode == 200) {
    String response = https.getString();
    Serial.print("[HTTP SUCCESS] Response: ");
    Serial.println(response);

    StaticJsonDocument<512> resDoc;
    deserializeJson(resDoc, response);

    // Provide tactile feedback from server contract
    const char* vib = resDoc["feedback"]["vibration_pattern"];
    if (strcmp(vib, "REQUEST_SENT") == 0) {
      const int sentPulse[] = {150, 100, 150};
      playVibration(sentPulse, 3);
      setRgbLed(234, 179, 8); // Yellow LED (Pending)
    } else if (strcmp(vib, "CANCELLED") == 0) {
      const int cancelPulse[] = {400, 200, 200};
      playVibration(cancelPulse, 3);
      setRgbLed(100, 116, 139); // Slate LED (Cancelled)
    }

    https.end();
    return true;
  } else {
    Serial.printf("[HTTP ERROR] Failed with code %d\n", httpCode);
    const int failPulse[] = {80, 50, 80, 50, 80, 50, 80};
    playVibration(failPulse, 7);
    setRgbLed(255, 0, 0); // Red LED
    https.end();
    return false;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUTTON_HELP, INPUT_PULLUP);
  pinMode(PIN_BUTTON_BREAK, INPUT_PULLUP);
  pinMode(PIN_BUTTON_CANCEL, INPUT_PULLUP);
  pinMode(PIN_VIBRATION, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_BLUE, OUTPUT);

  // Standby indicator (Slate blue)
  setRgbLed(71, 85, 105);

  Serial.printf("[SETUP] Mastery.ai Wearable %s (%s) Booting...\n", DEVICE_ID, ACCESSIBILITY_MODE);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[SETUP] Connected to Campus Wi-Fi!");
  // Power-on tactile confirmation (200ms pulse)
  const int initPulse[] = {200};
  playVibration(initPulse, 1);
  setRgbLed(16, 185, 129); // Green LED (Ready)
  delay(500);
  setRgbLed(71, 85, 105); // Standby
}

void loop() {
  // Check Help Button
  if (digitalRead(PIN_BUTTON_HELP) == LOW) {
    delay(50); // Debounce
    if (digitalRead(PIN_BUTTON_HELP) == LOW) {
      Serial.println("[BUTTON] 'I Need Help' Pressed");
      sendWearableEvent("I_NEED_HELP");
      while (digitalRead(PIN_BUTTON_HELP) == LOW); // Wait release
    }
  }

  // Check Break Button
  if (digitalRead(PIN_BUTTON_BREAK) == LOW) {
    delay(50);
    if (digitalRead(PIN_BUTTON_BREAK) == LOW) {
      Serial.println("[BUTTON] 'I Need a Break' Pressed");
      sendWearableEvent("I_NEED_BREAK");
      while (digitalRead(PIN_BUTTON_BREAK) == LOW);
    }
  }

  // Check Cancel Button
  if (digitalRead(PIN_BUTTON_CANCEL) == LOW) {
    delay(50);
    if (digitalRead(PIN_BUTTON_CANCEL) == LOW) {
      Serial.println("[BUTTON] 'Cancel' Pressed");
      sendWearableEvent("CANCEL");
      while (digitalRead(PIN_BUTTON_CANCEL) == LOW);
    }
  }

  delay(20);
}
