import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nullable for guest/anonymous usage
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="projects")
    recordings = relationship("Recording", back_populates="project", cascade="all, delete-orphan")
    glossary_items = relationship("GlossaryItem", back_populates="project", cascade="all, delete-orphan")


class Recording(Base):
    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    storage_filename = Column(String(300), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    duration_seconds = Column(Float, default=0.0)
    source_language = Column(String(50), default="Auto-detect")
    target_language = Column(String(50), default="English")
    
    # Status: 'uploaded', 'processing', 'ready', 'failed'
    status = Column(String(50), default="uploaded")
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="recordings")
    segments = relationship("TranscriptSegment", back_populates="recording", cascade="all, delete-orphan", order_by="TranscriptSegment.segment_order")
    insights = relationship("Insight", back_populates="recording", cascade="all, delete-orphan")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(Integer, primary_key=True, index=True)
    recording_id = Column(Integer, ForeignKey("recordings.id"), nullable=False)
    segment_order = Column(Integer, nullable=False)
    start_time = Column(Float, nullable=False)  # in seconds
    end_time = Column(Float, nullable=False)    # in seconds
    speaker_tag = Column(String(100), default="Speaker 1")
    detected_language = Column(String(100), default="Unknown")
    
    # Current active transcript & translation
    original_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=True)
    
    # Dual-Engine raw outputs
    raw_engine1_text = Column(Text, nullable=True) # e.g. Sarvam AI
    raw_engine2_text = Column(Text, nullable=True) # e.g. Gemini / Whisper
    comparison_score = Column(Float, default=1.0)  # RapidFuzz match ratio (0.0 to 1.0)
    confidence_score = Column(Float, default=0.95) # Acoustic confidence (0.0 to 1.0)
    
    # Review workflow fields: 'unverified', 'review_suggested', 'human_reviewed', 'unclear'
    review_status = Column(String(50), default="unverified")
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(Text, nullable=True)
    user_edited = Column(Boolean, default=False)
    
    # Audit fields
    reviewer_id = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    recording = relationship("Recording", back_populates="segments")


class GlossaryItem(Base):
    __tablename__ = "glossary_items"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    term = Column(String(200), nullable=False)
    category = Column(String(100), default="Terminology") # 'Name', 'Place', 'Organization', 'Terminology'
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="glossary_items")


class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    recording_id = Column(Integer, ForeignKey("recordings.id"), nullable=False)
    category = Column(String(100), nullable=False) # e.g. "Key Pain Point", "User Behavior", "Policy Perception"
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    linked_timestamp = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    recording = relationship("Recording", back_populates="insights")


class ContactSubmission(Base):
    __tablename__ = "contact_submissions"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    company_name = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    company_size = Column(String(100), nullable=True)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
