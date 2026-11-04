from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from ..database import get_db
from ..models.wearable import WearableDeviceRegister, WearableHeartbeat, DevicePairRequest
from ..services import device_service

router = APIRouter(prefix="/api/inclusive/devices", tags=["Wearable Devices"])

@router.get("")
def get_devices(source: str = None, db: sqlite3.Connection = Depends(get_db)):
    devices = device_service.list_devices(db, source=source)
    return {"success": True, "devices": devices}

@router.post("/register")
def register_device(payload: WearableDeviceRegister, db: sqlite3.Connection = Depends(get_db)):
    dev = device_service.register_device(db, payload.dict())
    return {"success": True, "device": dev}

@router.post("/heartbeat")
def update_heartbeat(payload: WearableHeartbeat, db: sqlite3.Connection = Depends(get_db)):
    updated = device_service.update_heartbeat(db, payload.device_id, payload.status, payload.battery_pct)
    if not updated:
        raise HTTPException(status_code=404, detail="Device not found")
    dev = device_service.find_device_by_id(db, payload.device_id)
    return {"success": True, "device": dev}

@router.post("/pair")
def pair_device(payload: DevicePairRequest, db: sqlite3.Connection = Depends(get_db)):
    paired = device_service.pair_device(db, payload.device_id, payload.student_id)
    if not paired:
        raise HTTPException(status_code=404, detail="Device not found")
    dev = device_service.find_device_by_id(db, payload.device_id)
    return {"success": True, "device": dev}
