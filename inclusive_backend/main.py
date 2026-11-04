from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import (
    inclusive_hub,
    wearable_devices,
    wearable_events,
    sensor_data,
    teacher_dashboard
)

app = FastAPI(
    title="Mastery.ai Inclusive Assistive Hub Backend",
    version="1.0.0",
    description="Wearable event management and sensor telemetry pipeline for ESP32 devices."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inclusive_hub.router)
app.include_router(wearable_devices.router)
app.include_router(wearable_events.router)
app.include_router(sensor_data.router)
app.include_router(teacher_dashboard.router)

@app.get("/healthz")
def healthcheck():
    return {"status": "ok", "module": "inclusive_assistive_hub"}
