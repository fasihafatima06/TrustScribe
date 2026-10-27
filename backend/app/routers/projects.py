from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User, Project
from ..schemas import ProjectCreate, ProjectResponse
from ..dependencies import get_current_user_optional

router = APIRouter(prefix="/api/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def get_user_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_optional)):
    query = db.query(Project)
    if current_user and current_user.email != "guest@trustscribe.local":
        projects = query.filter(Project.user_id == current_user.id).order_by(Project.created_at.desc()).all()
    else:
        # Show all projects or guest projects
        projects = query.order_by(Project.created_at.desc()).all()
        
    results = []
    for p in projects:
        results.append(ProjectResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            created_at=p.created_at,
            recordings_count=len(p.recordings)
        ))
    return results

@router.post("", response_model=ProjectResponse)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_optional)):
    project = Project(
        name=payload.name,
        description=payload.description,
        user_id=current_user.id if current_user else None
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        created_at=project.created_at,
        recordings_count=0
    )

@router.get("/{project_id}")
def get_project_details(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_optional)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "created_at": project.created_at,
        "recordings": [
            {
                "id": r.id,
                "filename": r.filename,
                "duration_seconds": r.duration_seconds,
                "source_language": r.source_language,
                "status": r.status,
                "segments_count": len(r.segments)
            } for r in project.recordings
        ]
    }
