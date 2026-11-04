from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from ..database import get_db
from ..services import alert_service, event_service, device_service

router = APIRouter(prefix="/api/inclusive", tags=["Inclusive Hub Overview"])

@router.get("/overview")
def get_hub_overview(db: sqlite3.Connection = Depends(get_db)):
    stats = alert_service.get_overview_statistics(db)
    recent_events = event_service.list_events(db, limit=10)
    devices = device_service.list_devices(db)
    return {
        "success": True,
        "stats": stats,
        "recentEvents": recent_events,
        "devices": devices,
    }

@router.post("/simulation/clear")
def clear_simulation(db: sqlite3.Connection = Depends(get_db)):
    result = alert_service.clear_simulation_records(db)
    return {"success": True, **result}
