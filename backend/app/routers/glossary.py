import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import GlossaryItem, Project, Recording, TranscriptSegment
from ..schemas import GlossaryItemCreate, GlossaryItemResponse
from ..dependencies import get_current_user_optional

router = APIRouter(prefix="/api", tags=["Glossary"])

@router.get("/projects/{project_id}/glossary", response_model=List[GlossaryItemResponse])
def get_project_glossary(
    project_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project.glossary_items

@router.post("/projects/{project_id}/glossary", response_model=GlossaryItemResponse)
def add_glossary_item(
    project_id: int,
    payload: GlossaryItemCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    item = GlossaryItem(
        project_id=project.id,
        term=payload.term.strip(),
        category=payload.category or "Terminology",
        description=payload.description
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/projects/{project_id}/glossary/{item_id}")
def delete_glossary_item(
    project_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    item = db.query(GlossaryItem).filter(GlossaryItem.id == item_id, GlossaryItem.project_id == project_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"status": "deleted", "item_id": item_id}

@router.post("/recordings/{recording_id}/glossary/apply")
def apply_glossary_standardization(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    glossary = db.query(GlossaryItem).filter(GlossaryItem.project_id == recording.project_id).all()
    if not glossary:
        # Prepopulate default glossary if empty
        defaults = [
            ("PhonePe", "Organization", "Digital payments brand"),
            ("Gram Panchayat", "Organization", "Village council governing unit"),
            ("Rythu Bharosa", "Term", "Agricultural investment assistance scheme"),
            ("Aadhaar", "Term", "Biometric digital identity"),
            ("UPI PIN", "Terminology", "Unified Payments Interface authorization PIN"),
            ("DBT", "Terminology", "Direct Benefit Transfer")
        ]
        for term, cat, desc in defaults:
            db.add(GlossaryItem(project_id=recording.project_id, term=term, category=cat, description=desc))
        db.commit()
        glossary = db.query(GlossaryItem).filter(GlossaryItem.project_id == recording.project_id).all()

    replacements_count = 0
    for seg in recording.segments:
        updated = False
        text = seg.original_text
        for g in glossary:
            pattern = re.compile(re.escape(g.term), re.IGNORECASE)
            if pattern.search(text) and not g.term in text:
                text = pattern.sub(g.term, text)
                updated = True
                replacements_count += 1
        
        if updated:
            seg.original_text = text
            seg.user_edited = True

    if replacements_count > 0:
        db.commit()

    return {
        "status": "success",
        "standardized_replacements": replacements_count,
        "active_terms_count": len(glossary)
    }
