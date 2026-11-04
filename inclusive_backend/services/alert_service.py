import sqlite3
from typing import Dict, Any

def get_overview_statistics(conn: sqlite3.Connection) -> Dict[str, int]:
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'student'")
    total_students = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM wearable_devices WHERE status = 'connected'")
    connected_wearables = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM wearable_events WHERE status = 'Pending'")
    pending_help_requests = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE review_flag = 1 OR is_anomaly = 1")
    active_device_alerts = cursor.fetchone()[0]

    return {
        "totalStudents": total_students,
        "connectedWearables": connected_wearables,
        "pendingHelpRequests": pending_help_requests,
        "activeDeviceAlerts": active_device_alerts,
    }

def clear_simulation_records(conn: sqlite3.Connection) -> Dict[str, int]:
    cursor = conn.cursor()
    cursor.execute("DELETE FROM wearable_events WHERE source = 'simulation'")
    evts = cursor.rowcount
    cursor.execute("DELETE FROM sensor_readings WHERE source = 'simulation'")
    sensors = cursor.rowcount
    cursor.execute("DELETE FROM wearable_devices WHERE source = 'simulation'")
    devs = cursor.rowcount
    conn.commit()
    return {
        "eventsCleared": evts,
        "sensorsCleared": sensors,
        "devicesCleared": devs
    }
