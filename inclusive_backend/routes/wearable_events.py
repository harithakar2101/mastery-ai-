from fastapi import APIRouter, Depends, HTTPException, Query
import sqlite3
from ..database import get_db
from ..models.wearable_event import WearableEventSubmission, WearableStatusUpdate
from ..services import event_service, device_service

router = APIRouter(prefix="/api/inclusive", tags=["Wearable Events"])

@router.post("/events")
def submit_wearable_event(payload: WearableEventSubmission, db: sqlite3.Connection = Depends(get_db)):
    # 1. Idempotency duplicate check
    if event_service.check_duplicate_event(db, payload.event_id):
        raise HTTPException(
            status_code=409,
            detail={"code": "DUPLICATE_EVENT", "message": "Event ID already processed."}
        )

    # 2. Ensure device exists or auto-register
    dev = device_service.find_device_by_id(db, payload.device_id)
    if not dev:
        dev = device_service.register_device(db, {
            "device_id": payload.device_id,
            "student_id": payload.student_id,
            "device_token": f"token_{payload.device_id}",
            "accessibility_mode": payload.accessibility_mode,
            "source": payload.source,
        })

    # 3. Record event
    event_dict = payload.dict()
    if not event_dict.get("student_id") and dev.get("student_id"):
        event_dict["student_id"] = dev["student_id"]

    result = event_service.record_event(db, event_dict)

    return {
        "success": True,
        "status": "DELIVERED",
        "event_id": payload.event_id,
        "feedback": result["feedback"],
    }

@router.get("/requests")
def list_requests(
    status: str = None,
    source: str = None,
    student_id: str = None,
    limit: int = Query(50, ge=1, le=200),
    db: sqlite3.Connection = Depends(get_db)
):
    events = event_service.list_events(db, student_id=student_id, status=status, source=source, limit=limit)
    return {"success": True, "events": events}

@router.post("/requests/{event_id}/acknowledge")
def acknowledge_request(event_id: str, db: sqlite3.Connection = Depends(get_db)):
    result = event_service.update_status(
        db,
        event_id,
        "Acknowledged",
        actor_id="TEACHER_SYSTEM",
        actor_name="Faculty Instructor",
        actor_role="teacher",
        notes="Acknowledged via Teacher Console"
    )
    if not result:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"success": True, **result}

@router.post("/requests/{event_id}/resolve")
def resolve_request(event_id: str, db: sqlite3.Connection = Depends(get_db)):
    result = event_service.update_status(
        db,
        event_id,
        "Resolved",
        actor_id="TEACHER_SYSTEM",
        actor_name="Faculty Instructor",
        actor_role="teacher",
        notes="Assistance provided and resolved"
    )
    if not result:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"success": True, **result}

@router.post("/requests/{event_id}/cancel")
def cancel_request(event_id: str, db: sqlite3.Connection = Depends(get_db)):
    result = event_service.update_status(
        db,
        event_id,
        "Cancelled",
        actor_id="USER_SYSTEM",
        actor_name="Student / Instructor",
        actor_role="student",
        notes="Withdrawn by user"
    )
    if not result:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"success": True, **result}
