from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user_optional
from ..models import User
from ..services.explore_library import create_explore_workspace

router = APIRouter(prefix="/api/explore", tags=["Explore workspace"])


@router.post("/workspace")
def create_workspace(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user_optional)
):
    try:
        if not current_user:
            current_user = db.query(User).filter(User.email == "guest@trustscribe.local").first()
            if not current_user:
                current_user = User(
                    email="guest@trustscribe.local",
                    hashed_password="guest_no_auth",
                    full_name="Guest Researcher"
                )
                db.add(current_user)
                db.commit()
                db.refresh(current_user)

        project, created = create_explore_workspace(db, current_user)
        return {"project_id": project.id, "created": created}
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not create the explore workspace: {error}")
