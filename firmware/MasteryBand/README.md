# MasteryBand BLE Smart Band Firmware

Open-source firmware specification and reference implementation for the **CogniCSE MasteryBand** wearable device (ESP32 / Nordic nRF52).

## Overview
The MasteryBand provides low-friction tactile telemetry between the student and the CogniCSE Pedagogical AI Engine.
It uses **Web Bluetooth** to broadcast student engagement cues directly to the browser with zero cognitive overhead, and provides subtle haptic vibration confirmations.

## BLE GATT Architecture

- **Primary Service UUID**: `12345678-1234-5678-1234-56789abcdef0`
- **Event Characteristic (Notify)**: `12345678-1234-5678-1234-56789abcdef1`
  - Properties: `NOTIFY`, `READ`
  - Payload: UTF-8 JSON object (e.g., `{"event": "NEED_HELP", "timestamp": 1729000000}`)
- **Command Characteristic (Write)**: `12345678-1234-5678-1234-56789abcdef2`
  - Properties: `WRITE`, `WRITE_WITHOUT_RESPONSE`
  - Payload: UTF-8 string commands controlling ERM/LRA haptic motors.

### Event Definitions (Band → Browser)
| Physical Gesture | Event Name | Pedagogical Reaction |
| :--- | :--- | :--- |
| **Single Tap** | `NEED_HELP` | Triggers a Tier 1 Metacognitive hint from the AI Tutor. |
| **Double Tap** | `NEED_HINT` | Escalates to a Tier 2 Conceptual guidance pattern. |
| **Long Press (1.5s)** | `I_UNDERSTAND` | Self-report signal. Prompts 1 diagnostic verification question (only verification updates BKT). |
| **Triple Tap / Hold** | `NEED_BREAK` | Signals cognitive fatigue; schedules a 5-minute restorative pause. |

### Haptic Commands (Browser → Band)
| Command String | Motor Pattern | Pedagogical Context |
| :--- | :--- | :--- |
| `SINGLE_SHORT` | 100ms pulse | Acknowledged input receipt |
| `DOUBLE_SHORT` | 2x 80ms pulses | Hint prepared & ready in UI |
| `TRIPLE_SHORT` | 3x 80ms pulses | DKM Node milestone achieved |
| `LONG` | 600ms steady pulse | Restorative break initiated |
| `SHORT_LONG` | 100ms + 400ms | Independent mastery verified |

## Browser Compatibility Note
Web Bluetooth requires Google Chrome or Microsoft Edge running over **HTTPS** or `localhost`.
Note: Web Bluetooth access may be restricted inside third-party `<iframe>` sandboxes. To pair physical hardware, open the application in a standalone browser window. Use the built-in **On-Screen Hardware Simulator** for full end-to-end testing in the iframe environment.
