import sqlite3
from datetime import datetime
import uuid
import json
from pathlib import Path
from typing import List, Optional, Dict, Any

# Load shared wearable config
CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "shared" / "wearable_config.json"
try:
    with open(CONFIG_PATH, "r") as f:
        WEARABLE_CONFIG = json.load(f)
except Exception:
    WEARABLE_CONFIG = {}

def check_duplicate_event(conn: sqlite3.Connection, event_id: str) -> bool:
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM wearable_events WHERE event_id = ?", (event_id,))
    return cursor.fetchone() is not None

def record_event(conn: sqlite3.Connection, data: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()
    record_id = f"evt_w_{uuid.uuid4().hex[:8]}"
    ts = data.get("timestamp") or now

    req = data["request"]
    mode = data["accessibility_mode"]

    vib_key = "CANCELLED" if req == "CANCEL" else ("ACKNOWLEDGED" if req == "ACKNOWLEDGE" else "REQUEST_SENT")
    led_color = "#64748B" if req == "CANCEL" else "#EAB308"
    oled_text = WEARABLE_CONFIG.get("oledMessages", {}).get(mode, {}).get("PENDING", "REQUEST SENT")

    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO wearable_events (
            id, event_id, device_id, student_id, event_type, request, accessibility_mode,
            status, vibration_pattern, led_color, oled_text, source, timestamp, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record_id,
        data["event_id"],
        data["device_id"],
        data.get("student_id"),
        data.get("event_type", "HELP_REQUEST"),
        data["request"],
        mode,
        "Cancelled" if req == "CANCEL" else "Pending",
        vib_key,
        led_color,
        oled_text,
        data.get("source", "hardware"),
        ts,
        now,
        now
    ))

    # Audit log
    audit_id = f"audit_{uuid.uuid4().hex[:8]}"
    cursor.execute("""
        INSERT INTO wearable_event_audit_logs (
            id, event_id, previous_status, new_status, actor_id, actor_name, actor_role, notes, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        audit_id,
        data["event_id"],
        None,
        "Cancelled" if req == "CANCEL" else "Pending",
        data.get("student_id") or data["device_id"],
        f"Student via {data['device_id']}",
        "student",
        f"Request originated via {mode} mode",
        now
    ))

    conn.commit()

    pattern_ms = WEARABLE_CONFIG.get("vibrationPatterns", {}).get(vib_key, {}).get("patternMs", [150, 100, 150])

    return {
        "event_id": data["event_id"],
        "status": "Pending",
        "feedback": {
            "vibration_pattern": vib_key,
            "pattern_ms": pattern_ms,
            "led_color": led_color,
            "oled_text": oled_text,
        }
    }

def update_status(
    conn: sqlite3.Connection,
    event_id: str,
    new_status: str,
    actor_id: str,
    actor_name: str,
    actor_role: str,
    notes: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM wearable_events WHERE event_id = ?", (event_id,))
    existing = cursor.fetchone()
    if not existing:
        return None

    prev_status = existing["status"]
    mode = existing["accessibility_mode"]
    now = datetime.utcnow().isoformat()

    ack_at = existing["acknowledged_at"]
    ack_by = existing["acknowledged_by"]
    res_at = existing["resolved_at"]
    res_by = existing["resolved_by"]

    if new_status == "Acknowledged" and not ack_at:
        ack_at = now
        ack_by = f"{actor_name} ({actor_id})"
    elif new_status in ("Resolved", "Cancelled"):
        res_at = now
        res_by = f"{actor_name} ({actor_id})"

    cursor.execute("""
        UPDATE wearable_events
        SET status = ?,
            acknowledged_at = ?,
            acknowledged_by = ?,
            resolved_at = ?,
            resolved_by = ?,
            updated_at = ?
        WHERE event_id = ?
    """, (new_status, ack_at, ack_by, res_at, res_by, now, event_id))

    audit_id = f"audit_{uuid.uuid4().hex[:8]}"
    cursor.execute("""
        INSERT INTO wearable_event_audit_logs (
            id, event_id, previous_status, new_status, actor_id, actor_name, actor_role, notes, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        audit_id,
        event_id,
        prev_status,
        new_status,
        actor_id,
        actor_name,
        actor_role,
        notes or f"Transitioned from {prev_status} to {new_status}",
        now
    ))

    conn.commit()

    vib_key = "ACKNOWLEDGED" if new_status == "Acknowledged" else ("RESOLVED" if new_status == "Resolved" else "CANCELLED")
    led_color = "#3B82F6" if new_status == "Acknowledged" else ("#10B981" if new_status == "Resolved" else "#64748B")
    oled_text = WEARABLE_CONFIG.get("oledMessages", {}).get(mode, {}).get(vib_key, new_status.upper())
    pattern_ms = WEARABLE_CONFIG.get("vibrationPatterns", {}).get(vib_key, {}).get("patternMs", [200])

    return {
        "event_id": event_id,
        "status": new_status,
        "feedback": {
            "vibration_pattern": vib_key,
            "pattern_ms": pattern_ms,
            "led_color": led_color,
            "oled_text": oled_text,
        }
    }

def list_events(
    conn: sqlite3.Connection,
    student_id: Optional[str] = None,
    device_id: Optional[str] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    sql = """
        SELECT e.*, u.name as student_name
        FROM wearable_events e
        LEFT JOIN users u ON e.student_id = u.id
        WHERE 1=1
    """
    params = []
    if student_id:
        sql += " AND e.student_id = ?"
        params.append(student_id)
    if device_id:
        sql += " AND e.device_id = ?"
        params.append(device_id)
    if status:
        sql += " AND e.status = ?"
        params.append(status)
    if source:
        sql += " AND e.source = ?"
        params.append(source)
    sql += " ORDER BY e.timestamp DESC LIMIT ?"
    params.append(limit)

    cursor = conn.cursor()
    cursor.execute(sql, params)
    return [dict(row) for row in cursor.fetchall()]
