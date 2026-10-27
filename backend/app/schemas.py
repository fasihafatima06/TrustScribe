from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    company_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    company_name: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    recordings_count: Optional[int] = 0
    class Config:
        from_attributes = True

class SegmentResponse(BaseModel):
    id: int
    segment_order: int
    start_time: float
    end_time: float
    speaker_tag: str
    detected_language: str
    original_text: str
    translated_text: Optional[str] = None
    raw_engine1_text: Optional[str] = None
    raw_engine2_text: Optional[str] = None
    comparison_score: float = 1.0
    confidence_score: float = 0.95
    review_status: str = "unverified"
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    user_edited: bool = False
    reviewer_id: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class SegmentUpdate(BaseModel):
    original_text: Optional[str] = None
    translated_text: Optional[str] = None
    speaker_tag: Optional[str] = None
    review_status: Optional[str] = None
    is_flagged: Optional[bool] = None
    flag_reason: Optional[str] = None
    reviewer_id: Optional[str] = None

class InsightResponse(BaseModel):
    id: int
    category: str
    title: str
    content: str
    linked_timestamp: Optional[float] = None
    class Config:
        from_attributes = True

class RecordingDetailResponse(BaseModel):
    id: int
    project_id: int
    filename: str
    storage_filename: str
    duration_seconds: float
    source_language: str
    target_language: str
    status: str
    summary: Optional[str] = None
    created_at: datetime
    segments: List[SegmentResponse] = []
    insights: List[InsightResponse] = []
    class Config:
        from_attributes = True

class GlossaryItemCreate(BaseModel):
    term: str
    category: Optional[str] = "Terminology"
    description: Optional[str] = None

class GlossaryItemResponse(BaseModel):
    id: int
    project_id: Optional[int]
    term: str
    category: str
    description: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class ContactCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    company_size: Optional[str] = None
    message: Optional[str] = None

class ContactResponse(BaseModel):
    id: int
    status: str = "received"
    message: str = "Thank you for getting in touch. Our team will contact you shortly."
