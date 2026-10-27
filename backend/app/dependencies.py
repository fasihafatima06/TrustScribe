import datetime
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional

from .database import get_db
from .models import User
from .security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

def get_or_create_guest_user(db: Session) -> User:
    guest = db.query(User).filter(User.email == "guest@trustscribe.local").first()
    if not guest:
        guest = User(
            email="guest@trustscribe.local",
            hashed_password="guest_session_no_auth_needed",
            full_name="Guest Researcher",
            company_name="TrustScribe Research Lab",
            created_at=datetime.datetime.utcnow()
        )
        db.add(guest)
        db.commit()
        db.refresh(guest)
    return guest

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Returns authenticated user if JWT token is present & valid.
    Otherwise gracefully falls back to the Guest Researcher user.
    Never blocks a visitor with a 401 error.
    """
    if credentials and credentials.credentials:
        try:
            payload = decode_access_token(credentials.credentials)
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == int(user_id)).first()
                if user:
                    return user
        except Exception:
            pass
    
    return get_or_create_guest_user(db)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    return get_current_user_optional(credentials, db)
