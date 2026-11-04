import sqlite3
from datetime import datetime
import uuid
from typing import List, Optional, Dict, Any

def list_devices(conn: sqlite3.Connection, source: Optional[str] = None, student_id: Optional[str] = None) -> List[Dict[str, Any]]:
    sql = """
        SELECT d.*, u.name as student_name
        FROM wearable_devices d
        LEFT JOIN users u ON d.student_id = u.id
        WHERE 1=1
    """
    params = []
    if source:
        sql += " AND d.source = ?"
        params.append(source)
    if student_id:
        sql += " AND d.student_id = ?"
        params.append(student_id)
    sql += " ORDER BY d.created_at DESC"
    cursor = conn.cursor()
    cursor.execute(sql, params)
    return [dict(row) for row in cursor.fetchall()]

def find_device_by_id(conn: sqlite3.Connection, device_id: str) -> Optional[Dict[str, Any]]:
    cursor = conn.cursor()
    cursor.execute("""
        SELECT d.*, u.name as student_name
        FROM wearable_devices d
        LEFT JOIN users u ON d.student_id = u.id
        WHERE d.device_id = ? OR d.id = ?
    """, (device_id, device_id))
    row = cursor.fetchone()
    return dict(row) if row else None

def register_device(conn: sqlite3.Connection, data: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()
    dev_id = f"dev_{uuid.uuid4().hex[:8]}"
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO wearable_devices (
            id, device_id, student_id, device_token, device_type, accessibility_mode,
            firmware_version, status, battery_pct, last_heartbeat, source, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(device_id) DO UPDATE SET
            student_id = excluded.student_id,
            device_token = excluded.device_token,
            accessibility_mode = excluded.accessibility_mode,
            status = excluded.status,
            battery_pct = excluded.battery_pct,
            last_heartbeat = excluded.last_heartbeat,
            updated_at = excluded.updated_at
    """, (
        dev_id,
        data["device_id"],
        data.get("student_id"),
        data["device_token"],
        data.get("device_type", "ESP32_WROOM_32"),
        data["accessibility_mode"],
        data.get("firmware_version", "1.0.0"),
        data.get("status", "connected"),
        data.get("battery_pct", 100),
        now,
        data.get("source", "hardware"),
        now,
        now
    ))
    conn.commit()
    return find_device_by_id(conn, data["device_id"])

def update_heartbeat(conn: sqlite3.Connection, device_id: str, status: str, battery_pct: Optional[int] = None) -> bool:
    now = datetime.utcnow().isoformat()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE wearable_devices
        SET status = ?,
            battery_pct = COALESCE(?, battery_pct),
            last_heartbeat = ?,
            updated_at = ?
        WHERE device_id = ?
    """, (status, battery_pct, now, now, device_id))
    conn.commit()
    return cursor.rowcount > 0

def pair_device(conn: sqlite3.Connection, device_id: str, student_id: str) -> bool:
    now = datetime.utcnow().isoformat()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE wearable_devices
        SET student_id = ?, updated_at = ?
        WHERE device_id = ?
    """, (student_id, now, device_id))
    conn.commit()
    return cursor.rowcount > 0
