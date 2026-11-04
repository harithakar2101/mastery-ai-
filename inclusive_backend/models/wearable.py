from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class WearableDeviceBase(BaseModel):
    device_id: str = Field(..., description="Unique ESP32 device ID e.g. ESP32-01")
    student_id: Optional[str] = None
    device_type: str = "ESP32_WROOM_32"
    accessibility_mode: Literal["BLIND", "DEAF", "NON_SPEAKING"]
    firmware_version: str = "1.0.0"
    status: Literal["connected", "disconnected", "pairing"] = "connected"
    battery_pct: int = Field(100, ge=0, le=100)
    source: Literal["simulation", "hardware"] = "hardware"

class WearableDeviceRegister(WearableDeviceBase):
    device_token: str = Field(..., description="Per-device API secret or token")

class WearableDeviceResponse(WearableDeviceBase):
    id: str
    student_name: Optional[str] = None
    last_heartbeat: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class WearableHeartbeat(BaseModel):
    device_id: str
    status: Literal["connected", "disconnected"]
    battery_pct: Optional[int] = Field(None, ge=0, le=100)

class DevicePairRequest(BaseModel):
    device_id: str
    student_id: str
