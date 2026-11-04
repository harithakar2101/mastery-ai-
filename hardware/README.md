# Mastery.ai – Inclusive Wearable Hardware Specification

This directory contains the reference hardware design, firmware sketches, and configuration contracts for the **Mastery.ai Inclusive Assistive Hub** wearable peripherals (ESP32-based).

---

## 1. Supported Wearable Types & Accessibility Modes

| Mode | Hardware Profile | Primary Signals | Feedback Mechanism |
| :--- | :--- | :--- | :--- |
| **Blind Mode** | `ESP32-01` | Tactile physical push-buttons with Braille textures. | Haptic vibration patterns only. Zero reliance on OLED or LEDs. |
| **Deaf Mode** | `ESP32-02` | High-contrast 0.96" SSD1306 OLED, Tri-color RGB LED. | Visual text banner, multi-color state LED, vibration pulse. |
| **Non-speaking Mode** | `ESP32-03` | 3 dedicated momentary switches (Help, Break, Cancel). | Visual confirmation on screen + tactile vibration acknowledgment. |

---

## 2. Event Contract & JSON Payload

When a student initiates an interaction, the ESP32 dispatches an HTTPS POST request to:
`POST /api/inclusive/events`

### Example Payload:
```json
{
  "event_id": "4a72d3e1-8849-43c2-8491-91a2718e0012",
  "device_id": "ESP32-03",
  "event_type": "HELP_REQUEST",
  "request": "I_NEED_HELP",
  "accessibility_mode": "NON_SPEAKING",
  "timestamp": "2026-11-04T08:30:00Z",
  "source": "hardware"
}
```

### Server Response with Immediate Device Feedback:
```json
{
  "success": true,
  "status": "DELIVERED",
  "event_id": "4a72d3e1-8849-43c2-8491-91a2718e0012",
  "feedback": {
    "vibration_pattern": "REQUEST_SENT",
    "pattern_ms": [150, 100, 150],
    "led_color": "#EAB308",
    "oled_text": "SENT: I NEED HELP\nWAITING FOR TEACHER"
  }
}
```

---

## 3. Vibration & LED Color Standard (from `shared/wearable_config.json`)

| Status / Event | Vibration Sequence | LED Hex | Description |
| :--- | :--- | :--- | :--- |
| **Activation** | `[200ms]` | `#10B981` (Green) | Button press detected. |
| **Request Sent** | `[150ms, 100ms, 150ms]` | `#EAB308` (Yellow) | Cloud acknowledged receipt. |
| **Acknowledged** | `[300ms, 100ms, 300ms, 100ms, 500ms]` | `#3B82F6` (Blue) | Teacher acknowledged assistance. |
| **Assistance Provided** | `[200ms, 100ms, 200ms]` | `#8B5CF6` (Purple) | Teacher actively supporting. |
| **Resolved** | `[100ms, 80ms, 100ms, 80ms, 300ms]` | `#10B981` (Green) | Session marked clear. |
| **Failure / Offline** | `[80ms, 50ms, 80ms, 50ms, 80ms, 50ms, 80ms]` | `#EF4444` (Red) | Delivery failed or Wi-Fi dropped. |
| **Cancelled** | `[400ms, 200ms, 200ms]` | `#64748B` (Slate) | Request withdrawn. |

---

## 4. How to Flash Physical Hardware

1. Open `esp32_inclusive_wearable.ino` in Arduino IDE or PlatformIO.
2. Install **ArduinoJson** (v6 or v7) and **WiFiClientSecure** libraries.
3. Configure `WIFI_SSID` and `WIFI_PASSWORD` for your local network.
4. Set `API_EVENT_URL` to point to your Mastery.ai host (`https://your-domain.com/api/inclusive/events`).
5. Upload to an ESP32 Development Board (NodeMCU / WROOM-32).

---

## 5. Switching from Simulator to Hardware

- **In the Web UI**: Visit the `/inclusive-hub/simulator` page and toggle the **"Device Connection Mode"** switch from `Simulation Mode` to `Hardware Mode`.
- The live dashboard listens to the exact same endpoints and updates automatically via Server-Sent Events (SSE).
