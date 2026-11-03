/*
 * CogniCSE MasteryBand BLE Peripheral Firmware
 * Target: ESP32-C3 / ESP32-S3 / nRF52840
 * Service UUID: 12345678-1234-5678-1234-56789abcdef0
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID        "12345678-1234-5678-1234-56789abcdef0"
#define EVENT_CHAR_UUID     "12345678-1234-5678-1234-56789abcdef1"
#define COMMAND_CHAR_UUID   "12345678-1234-5678-1234-56789abcdef2"

#define PIN_BUTTON          0
#define PIN_HAPTIC_MOTOR    2

BLEServer* pServer = NULL;
BLECharacteristic* pEventCharacteristic = NULL;
BLECharacteristic* pCommandCharacteristic = NULL;
bool deviceConnected = false;

void triggerHaptic(const char* pattern) {
  if (strcmp(pattern, "SINGLE_SHORT") == 0) {
    digitalWrite(PIN_HAPTIC_MOTOR, HIGH);
    delay(100);
    digitalWrite(PIN_HAPTIC_MOTOR, LOW);
  } else if (strcmp(pattern, "DOUBLE_SHORT") == 0) {
    digitalWrite(PIN_HAPTIC_MOTOR, HIGH); delay(80);
    digitalWrite(PIN_HAPTIC_MOTOR, LOW); delay(60);
    digitalWrite(PIN_HAPTIC_MOTOR, HIGH); delay(80);
    digitalWrite(PIN_HAPTIC_MOTOR, LOW);
  } else if (strcmp(pattern, "TRIPLE_SHORT") == 0) {
    for (int i = 0; i < 3; i++) {
      digitalWrite(PIN_HAPTIC_MOTOR, HIGH); delay(80);
      digitalWrite(PIN_HAPTIC_MOTOR, LOW); delay(60);
    }
  } else if (strcmp(pattern, "LONG") == 0) {
    digitalWrite(PIN_HAPTIC_MOTOR, HIGH);
    delay(600);
    digitalWrite(PIN_HAPTIC_MOTOR, LOW);
  } else if (strcmp(pattern, "SHORT_LONG") == 0) {
    digitalWrite(PIN_HAPTIC_MOTOR, HIGH); delay(100);
    digitalWrite(PIN_HAPTIC_MOTOR, LOW); delay(80);
    digitalWrite(PIN_HAPTIC_MOTOR, HIGH); delay(400);
    digitalWrite(PIN_HAPTIC_MOTOR, LOW);
  }
}

class CommandCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String value = pCharacteristic->getValue();
    if (value.length() > 0) {
      triggerHaptic(value.c_str());
    }
  }
};

class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
  }
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    pServer->startAdvertising();
  }
};

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_HAPTIC_MOTOR, OUTPUT);
  digitalWrite(PIN_HAPTIC_MOTOR, LOW);

  BLEDevice::init("CogniCSE-MasteryBand");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pEventCharacteristic = pService->createCharacteristic(
    EVENT_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pEventCharacteristic->addDescriptor(new BLE2902());

  pCommandCharacteristic = pService->createCharacteristic(
    COMMAND_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  pCommandCharacteristic->setCallbacks(new CommandCallbacks());

  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
}

void loop() {
  // Reference button debouncing loop
  delay(20);
}
