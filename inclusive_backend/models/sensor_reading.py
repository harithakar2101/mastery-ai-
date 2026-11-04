from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class SensorReadingSubmission(BaseModel):
    device_id: str
    student_id: Optional[str] = None
    heart_rate: Optional[float] = Field(None, ge=30, le=220)
    spo2: Optional[float] = Field(None, ge=50, le=100)
    gsr_eda: Optional[float] = Field(None, ge=0, le=100)
    accel_x: Optional[float] = None
    accel_y: Optional[float] = None
    accel_z: Optional[float] = None
    temp_c: Optional[float] = Field(None, ge=30, le=45)
    source: Literal["simulation", "hardware"] = "hardware"
    timestamp: Optional[datetime] = None

class SensorReadingResponse(BaseModel):
    success: bool
    reading_id: str
    is_anomaly: bool
    review_flag: bool
    note: str = "Sensor readings cannot confirm stress, discomfort or learning state. Student-initiated requests remain the primary signal."
