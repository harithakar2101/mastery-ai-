from fastapi import APIRouter, Depends
import sqlite3
from ..database import get_db
from ..services import alert_service, event_service, device_service

router = APIRouter(prefix="/api/inclusive/teacher", tags=["Teacher Inclusive Dashboard"])

@router.get("/queue")
def get_teacher_request_queue(db: sqlite3.Connection = Depends(get_db)):
    events = event_service.list_events(db, limit=100)
    devices = device_service.list_devices(db)
    stats = alert_service.get_overview_statistics(db)
    return {
        "success": True,
        "queue": [e for e in events if e["status"] in ("Pending", "Acknowledged", "Assistance Provided")],
        "allEvents": events,
        "devices": devices,
        "stats": stats,
    }
