import datetime
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Recording, TranscriptSegment, GlossaryItem
from ..schemas import RecordingDetailResponse, SegmentResponse, SegmentUpdate
from ..dependencies import get_current_user_optional
from ..services.exports import generate_docx_export, generate_pdf_export, generate_txt_export, generate_json_export

router = APIRouter(prefix="/api/recordings", tags=["Transcripts"])

@router.get("/{recording_id}", response_model=RecordingDetailResponse)
def get_recording_workspace(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    return recording

@router.patch("/segments/{segment_id}", response_model=SegmentResponse)
def update_transcript_segment(
    segment_id: int,
    payload: SegmentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    seg = db.query(TranscriptSegment).filter(TranscriptSegment.id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")

    if payload.original_text is not None:
        seg.original_text = payload.original_text
        seg.user_edited = True
    if payload.translated_text is not None:
        seg.translated_text = payload.translated_text
        seg.user_edited = True
    if payload.speaker_tag is not None:
        seg.speaker_tag = payload.speaker_tag
    if payload.review_status is not None:
        seg.review_status = payload.review_status
        if payload.review_status == "human_reviewed":
            seg.reviewed_at = datetime.datetime.utcnow()
            seg.reviewer_id = payload.reviewer_id or (current_user.full_name if current_user else "Researcher")
            seg.is_flagged = False
        elif payload.review_status == "review_suggested":
            seg.is_flagged = True
        elif payload.review_status == "unclear":
            seg.is_flagged = True
            seg.reviewed_at = datetime.datetime.utcnow()
            seg.reviewer_id = payload.reviewer_id or (current_user.full_name if current_user else "Researcher")
    if payload.is_flagged is not None:
        seg.is_flagged = payload.is_flagged
    if payload.flag_reason is not None:
        seg.flag_reason = payload.flag_reason

    db.commit()
    db.refresh(seg)
    return seg

@router.get("/{recording_id}/export/docx")
def export_transcript_docx(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    glossary = db.query(GlossaryItem).filter(GlossaryItem.project_id == recording.project_id).all()
    target = generate_docx_export(recording, recording.segments, glossary)
    
    return Response(
        content=target.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=TrustScribe_{recording.id}_Report.docx"}
    )

@router.get("/{recording_id}/export/pdf")
def export_transcript_pdf(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    target = generate_pdf_export(recording, recording.segments)
    
    return Response(
        content=target.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=TrustScribe_{recording.id}_Report.pdf"}
    )

@router.get("/{recording_id}/export/txt")
def export_transcript_txt(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    content = generate_txt_export(recording, recording.segments)
    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=TrustScribe_{recording.id}_Report.txt"}
    )

@router.get("/{recording_id}/export/json")
def export_transcript_json(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    content = generate_json_export(recording, recording.segments)
    return Response(
        content=content,
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=TrustScribe_{recording.id}_Report.json"}
    )
