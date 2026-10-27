from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ContactSubmission
from ..schemas import ContactCreate, ContactResponse

router = APIRouter(prefix="/api/contact", tags=["Contact"])

@router.post("", response_model=ContactResponse)
def submit_contact_inquiry(payload: ContactCreate, db: Session = Depends(get_db)):
    submission = ContactSubmission(
        email=payload.email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        company_name=payload.company_name,
        job_title=payload.job_title,
        company_size=payload.company_size,
        message=payload.message
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return ContactResponse(
        id=submission.id,
        status="received",
        message="Thank you for getting in touch. Our team will contact you shortly."
    )
