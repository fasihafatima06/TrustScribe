import os
import shutil
import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import User, Project, Recording, TranscriptSegment, Insight
from ..dependencies import get_current_user_optional
from ..services.transcription import transcribe_audio_multi_engine
from ..services.insights import generate_interview_summary_and_insights

router = APIRouter(prefix="/api", tags=["Uploads"])

UPLOAD_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
os.makedirs(UPLOAD_ROOT, exist_ok=True)

def process_and_save_recording(
    db: Session,
    project_id: int,
    filename: str,
    disk_path: str,
    source_language: str = "Auto-detect",
    target_language: str = "English",
    duration_seconds: float = 32.0
) -> Recording:
    file_size = os.path.getsize(disk_path) if os.path.exists(disk_path) else 1024
    storage_name = os.path.basename(disk_path)

    recording = Recording(
        project_id=project_id,
        filename=filename,
        storage_filename=storage_name,
        file_path=disk_path,
        file_size_bytes=file_size,
        duration_seconds=duration_seconds,
        source_language=source_language,
        target_language=target_language,
        status="processing"
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)

    try:
        # Run dual engine transcription and RapidFuzz comparison
        segments_data = transcribe_audio_multi_engine(disk_path, language_name=source_language)
        
        # Calculate actual duration from segments
        if segments_data and len(segments_data) > 0:
            recording.duration_seconds = max([s.get("end", 30.0) for s in segments_data])

        for s in segments_data:
            segment_db = TranscriptSegment(
                recording_id=recording.id,
                segment_order=s.get("order", 1),
                start_time=s.get("start", 0.0),
                end_time=s.get("end", 5.0),
                speaker_tag=s.get("speaker", "Speaker 1"),
                detected_language=s.get("language", "Code-mixed"),
                original_text=s.get("original_text", s.get("text", "")),
                translated_text=s.get("translation", ""),
                raw_engine1_text=s.get("engine1_text", ""),
                raw_engine2_text=s.get("engine2_text", ""),
                comparison_score=s.get("comparison_score", 1.0),
                confidence_score=s.get("confidence", 0.95),
                review_status=s.get("review_status", "unverified"),
                is_flagged=s.get("is_flagged", False),
                flag_reason=s.get("flag_reason", None)
            )
            db.add(segment_db)

        # Generate summary and evidence-linked research insights
        insights_data = generate_interview_summary_and_insights(filename, segments_data)
        recording.summary = insights_data.get("summary", "")

        for ins in insights_data.get("insights", []):
            insight_db = Insight(
                recording_id=recording.id,
                category=ins["category"],
                title=ins["title"],
                content=ins["content"],
                linked_timestamp=ins.get("linked_timestamp", 0.0)
            )
            db.add(insight_db)

        recording.status = "ready"
        db.commit()
        db.refresh(recording)
        return recording

    except Exception as e:
        recording.status = "failed"
        db.commit()
        raise e

@router.post("/upload-direct")
async def upload_direct_interview(
    file: UploadFile = File(...),
    source_language: str = Form("Auto-detect"),
    target_language: str = Form("English"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Direct 1-step upload without any login or authentication required.
    Automatically creates a project for the guest or authenticated user,
    processes the audio through the TrustScribe dual-engine pipeline,
    and returns the recording ID ready for immediate verification.
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp3", ".wav", ".m4a", ".mp4", ".ogg"]:
        raise HTTPException(status_code=400, detail="Unsupported format. Please upload MP3, WAV, M4A, MP4, or OGG.")

    # Create project automatically
    project_title = os.path.splitext(file.filename)[0].replace("_", " ").title()
    project = Project(
        name=project_title or "Multilingual Interview Research",
        description=f"Auto-created project for {file.filename}",
        user_id=current_user.id if current_user else None
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    storage_name = f"rec_{project.id}_{int(time.time())}_{file.filename}"
    disk_path = os.path.join(UPLOAD_ROOT, storage_name)

    with open(disk_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    recording = process_and_save_recording(
        db=db,
        project_id=project.id,
        filename=file.filename,
        disk_path=disk_path,
        source_language=source_language,
        target_language=target_language
    )

    return {
        "status": "success",
        "recording_id": recording.id,
        "project_id": project.id,
        "filename": recording.filename,
        "duration": recording.duration_seconds
    }

@router.post("/projects/{project_id}/recordings/upload")
async def upload_and_process_recording(
    project_id: int,
    file: UploadFile = File(...),
    source_language: str = Form("Auto-detect"),
    target_language: str = Form("English"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp3", ".wav", ".m4a", ".mp4", ".ogg"]:
        raise HTTPException(status_code=400, detail="Unsupported format. Please upload MP3, WAV, M4A, or MP4.")

    storage_name = f"proj_{project_id}_{int(time.time())}_{file.filename}"
    disk_path = os.path.join(UPLOAD_ROOT, storage_name)

    with open(disk_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    recording = process_and_save_recording(
        db=db,
        project_id=project.id,
        filename=file.filename,
        disk_path=disk_path,
        source_language=source_language,
        target_language=target_language
    )

    return {"status": "success", "recording_id": recording.id}

@router.post("/seed-sample/{sample_id}")
async def load_sample_recording(
    sample_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Instantly provisions one of the preloaded research samples (Telugu, Hindi, Tamil)
    so users can experience the full platform with zero friction.
    """
    sample_configs = {
        "rural_payments": {
            "title": "Rural Payments Interview - Telugu & English",
            "filename": "sample_rural_payments_telugu_en.wav",
            "source_language": "Telugu + English",
            "duration": 31.8
        },
        "digital_banking": {
            "title": "Digital Banking & UPI Fieldwork - Hindi & English",
            "filename": "sample_digital_banking_hindi_en.wav",
            "source_language": "Hindi + English",
            "duration": 31.0
        },
        "healthcare": {
            "title": "Primary Health Centre Access - Tamil & English",
            "filename": "sample_healthcare_tamil_en.wav",
            "source_language": "Tamil + English",
            "duration": 32.0
        }
    }

    config = sample_configs.get(sample_id, sample_configs["rural_payments"])
    
    # Check if this sample was already seeded
    existing = db.query(Recording).filter(Recording.filename == config["filename"]).first()
    if existing and len(existing.segments) > 0:
        return {
            "status": "success",
            "recording_id": existing.id,
            "project_id": existing.project_id
        }

    project = Project(
        name=config["title"],
        description="Sample qualitative research interview demonstrating cross-engine discrepancy detection",
        user_id=current_user.id if current_user else None
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    disk_path = os.path.join(UPLOAD_ROOT, config["filename"])

    recording = process_and_save_recording(
        db=db,
        project_id=project.id,
        filename=config["filename"],
        disk_path=disk_path,
        source_language=config["source_language"],
        target_language="English",
        duration_seconds=config["duration"]
    )

    return {
        "status": "success",
        "recording_id": recording.id,
        "project_id": project.id
    }
