from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import get_current_user_optional
from ..models import Insight, Recording, User
from ..schemas import InsightResponse

router = APIRouter(prefix="/api/recordings", tags=["Insights"])

@router.get("/{recording_id}/insights", response_model=List[InsightResponse])
def get_recording_insights(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    return db.query(Insight).filter(Insight.recording_id == recording_id).order_by(Insight.created_at.asc()).all()
