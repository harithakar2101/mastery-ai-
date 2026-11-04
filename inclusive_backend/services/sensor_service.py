import sqlite3
from datetime import datetime
import uuid
from typing import List, Optional, Dict, Any

def record_sensor_reading(conn: sqlite3.Connection, data: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()
    sens_id = f"sens_{uuid.uuid4().hex[:8]}"
    ts = data.get("timestamp") or now

    # Noise and anomaly filtering
    is_anomaly = False
    review_flag = False

    hr = data.get("heart_rate")
    if hr and (hr > 130 or hr < 48):
        is_anomaly = True
        review_flag = True

    spo2 = data.get("spo2")
    if spo2 and spo2 < 92:
        is_anomaly = True
        review_flag = True

    gsr = data.get("gsr_eda")
    if gsr and gsr > 25.0:
        review_flag = True

    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO sensor_readings (
            id, device_id, student_id, heart_rate, spo2, gsr_eda, accel_x, accel_y, accel_z, temp_c,
            is_anomaly, review_flag, source, timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        sens_id,
        data["device_id"],
        data.get("student_id"),
        hr,
        spo2,
        gsr,
        data.get("accel_x"),
        data.get("accel_y"),
        data.get("accel_z"),
        data.get("temp_c"),
        1 if is_anomaly else 0,
        1 if review_flag else 0,
        data.get("source", "hardware"),
        ts,
        now
    ))
    conn.commit()

    return {
        "success": True,
        "reading_id": sens_id,
        "is_anomaly": is_anomaly,
        "review_flag": review_flag,
        "note": "Sensor readings cannot confirm stress, discomfort or learning state. Student-initiated requests remain the primary signal."
    }

def list_recent_readings(
    conn: sqlite3.Connection,
    device_id: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    sql = """
        SELECT s.*, u.name as student_name
        FROM sensor_readings s
        LEFT JOIN users u ON s.student_id = u.id
        WHERE 1=1
    """
    params = []
    if device_id:
        sql += " AND s.device_id = ?"
        params.append(device_id)
    if source:
        sql += " AND s.source = ?"
        params.append(source)
    sql += " ORDER BY s.timestamp DESC LIMIT ?"
    params.append(limit)

    cursor = conn.cursor()
    cursor.execute(sql, params)
    return [dict(row) for row in cursor.fetchall()]
