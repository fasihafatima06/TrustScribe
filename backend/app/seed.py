import os
import subprocess
import datetime
from sqlalchemy.orm import Session
from .models import User, Project, Recording, TranscriptSegment, GlossaryItem, Insight
from .security import get_password_hash
from .services.transcription import get_realistic_interview_template
from .services.comparison import compare_engine_segments
from .services.insights import generate_interview_summary_and_insights

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))

def generate_sample_wav_if_missing(file_path: str, spoken_text: str = "Hello, this is a spoken audio recording for TrustScribe."):
    if os.path.exists(file_path) and os.path.getsize(file_path) > 10000:
        return
    
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    try:
        clean_text = spoken_text.replace("'", "").replace('"', '')
        ps_cmd = f"Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SetOutputToWaveFile('{file_path}'); $s.Speak('{clean_text}'); $s.Dispose()"
        subprocess.run(["powershell", "-Command", ps_cmd], check=True, timeout=15)
    except Exception as e:
        print(f"[Seed Speech Warning] {e}")

def seed_database_samples(db: Session):
    # Ensure demo user exists with valid hashed password
    hashed_default = get_password_hash("password123")
    demo_user = db.query(User).filter(User.email == "demo@trustscribe.com").first()
    if not demo_user:
        demo_user = User(
            email="demo@trustscribe.com",
            hashed_password=hashed_default,
            full_name="Dr. Ananya Sharma",
            company_name="TrustScribe Research Lab",
            created_at=datetime.datetime.utcnow()
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
    else:
        demo_user.hashed_password = hashed_default
        db.commit()

    # Ensure guest user exists with valid hashed password
    guest = db.query(User).filter(User.email == "guest@trustscribe.local").first()
    if not guest:
        guest = User(
            email="guest@trustscribe.local",
            hashed_password=hashed_default,
            full_name="Guest Researcher",
            company_name="TrustScribe Research Lab",
            created_at=datetime.datetime.utcnow()
        )
        db.add(guest)
        db.commit()
        db.refresh(guest)
    else:
        guest.hashed_password = hashed_default
        db.commit()

    # Sample 1: Rural Payments Interview (Telugu + English)
    fn_te = "sample_rural_payments_telugu_en.wav"
    path_te = os.path.join(UPLOAD_DIR, fn_te)
    generate_sample_wav_if_missing(
        path_te,
        "Namaskaram andi. How are you using digital payments in your village? Here, network weak undi, so payment process avvaledu. Money was deducted from the account, but merchant received no confirmation."
    )

    # Sample 2: Digital Banking & UPI (Hindi + English)
    fn_hi = "sample_digital_banking_hindi_en.wav"
    path_hi = os.path.join(UPLOAD_DIR, fn_hi)
    generate_sample_wav_if_missing(
        path_hi,
        "Namaste. Can you share how you use UPI and Google Pay in your daily routine? Ration shop par network down hota hai toh payment atak jati hai."
    )

    # Sample 3: Healthcare Access (Tamil + English)
    fn_ta = "sample_healthcare_tamil_en.wav"
    path_ta = os.path.join(UPLOAD_DIR, fn_ta)
    generate_sample_wav_if_missing(
        path_ta,
        "Vanakkam. How has your experience been getting doctor appointments at the Primary Health Centre? Token queue is very long in the morning."
    )

    # Check if primary sample project exists
    existing = db.query(Recording).filter(Recording.filename == fn_te).first()
    if not existing:
        project_te = Project(
            name="Rural Payments Interview",
            description="Qualitative field study examining UPI transaction failure modes and DBT assistance in rural Andhra Pradesh",
            user_id=guest.id,
            created_at=datetime.datetime.utcnow()
        )
        db.add(project_te)
        db.commit()
        db.refresh(project_te)

        # Seed Glossary
        glossary_terms = [
            ("PhonePe", "Organization", "Digital payments brand widely used in rural retail"),
            ("Gram Panchayat", "Organization", "Village council governing unit"),
            ("Rythu Bharosa", "Term", "Agricultural investment assistance scheme"),
            ("Aadhaar", "Term", "Biometric digital identity"),
            ("UPI PIN", "Terminology", "Unified Payments Interface authorization PIN"),
            ("DBT", "Terminology", "Direct Benefit Transfer")
        ]
        for term, cat, desc in glossary_terms:
            db.add(GlossaryItem(project_id=project_te.id, term=term, category=cat, description=desc))

        recording = Recording(
            project_id=project_te.id,
            filename=fn_te,
            storage_filename=fn_te,
            file_path=path_te,
            file_size_bytes=os.path.getsize(path_te) if os.path.exists(path_te) else 1024000,
            duration_seconds=1725.0, # 28 minutes 45 seconds research fieldwork interview
            source_language="Telugu + English (Code-mixed)",
            target_language="English",
            status="ready"
        )
        db.add(recording)
        db.commit()
        db.refresh(recording)

        raw_segs = get_realistic_interview_template(fn_te)
        for s in raw_segs:
            is_flg = s.get("is_flagged", False)
            rev_stat = s.get("review_status", "unverified")
            comp_score = s.get("comparison_score", 0.72 if is_flg else 0.98)
            flg_rsn = s.get("flag_reason", None)

            seg_db = TranscriptSegment(
                recording_id=recording.id,
                segment_order=s["order"],
                start_time=s["start"],
                end_time=s["end"],
                speaker_tag=s["speaker"],
                detected_language=s["language"],
                original_text=s["original_text"],
                translated_text=s["translation"],
                raw_engine1_text=s["engine1_text"],
                raw_engine2_text=s["engine2_text"],
                comparison_score=comp_score,
                confidence_score=s["confidence"],
                review_status=rev_stat,
                is_flagged=is_flg,
                flag_reason=flg_rsn,
                user_edited=True if rev_stat == "human_reviewed" else False,
                reviewer_id="Priya Sharma (Research Lead)" if rev_stat == "human_reviewed" else None,
                reviewed_at=datetime.datetime.utcnow() if rev_stat == "human_reviewed" else None
            )
            db.add(seg_db)

        # Add Insights
        insights_data = generate_interview_summary_and_insights(fn_te, raw_segs)
        recording.summary = insights_data["summary"]
        for ins in insights_data["insights"]:
            db.add(Insight(
                recording_id=recording.id,
                category=ins["category"],
                title=ins["title"],
                content=ins["content"],
                linked_timestamp=ins.get("linked_timestamp", 0.0)
            ))

        db.commit()
