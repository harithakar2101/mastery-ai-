from fastapi import APIRouter, Depends, HTTPException, Query
import sqlite3
from ..database import get_db
from ..models.sensor_reading import SensorReadingSubmission
from ..services import sensor_service

router = APIRouter(prefix="/api/inclusive/sensors", tags=["Sensor Data"])

@router.post("")
def record_sensor_telemetry(payload: SensorReadingSubmission, db: sqlite3.Connection = Depends(get_db)):
    result = sensor_service.record_sensor_reading(db, payload.dict())
    return result

@router.get("")
def get_sensor_readings(
    device_id: str = None,
    source: str = None,
    limit: int = Query(50, ge=1, le=200),
    db: sqlite3.Connection = Depends(get_db)
):
    readings = sensor_service.list_recent_readings(db, device_id=device_id, source=source, limit=limit)
    return {"success": True, "readings": readings}
