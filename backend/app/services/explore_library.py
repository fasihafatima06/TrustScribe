"""Create a small, attributable workspace from a public Hugging Face dataset."""

import os
import re
import shutil
import uuid

from sqlalchemy.orm import Session

from ..models import Project, Recording, TranscriptSegment, User
from .translation import translate_segments

DATASET_ID = "praneeetha/tts-indian-languages"
PROJECT_NAME = "Explore transcription workspace"
LANGUAGE_NAMES = {"en-IN": "English (India)", "hi-IN": "Hindi", "te-IN": "Telugu"}


def _safe_filename(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", value)


def create_explore_workspace(db: Session, user: User) -> tuple[Project, bool]:
    """Make one multi-recording project for a user, downloading public data on demand."""
    existing = (
        db.query(Project)
        .filter(Project.user_id == user.id, Project.name == PROJECT_NAME)
        .first()
    )
    if existing:
        return existing, False

    # Kept here rather than at application startup: only users who choose this
    # workspace download public dataset content.
    from datasets import Audio, load_dataset

    dataset = load_dataset(DATASET_ID, split="train")
    dataset = dataset.cast_column("audio", Audio(decode=False))

    project = Project(
        name=PROJECT_NAME,
        description=(
            "A short public audio collection for exploring TrustScribe. "
            "Source: praneeetha/tts-indian-languages (CC BY 4.0).",
        ),
        user_id=user.id,
    )
    db.add(project)
    db.flush()

    upload_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
    os.makedirs(upload_root, exist_ok=True)
    selected_per_language = {"en-IN": 0, "hi-IN": 0, "te-IN": 0}

    for row in dataset:
        language = row["language"]
        if language not in selected_per_language or selected_per_language[language] >= 2:
            continue

        audio = row["audio"]
        original_name = _safe_filename(row["file"])
        storage_name = f"explore_{user.id}_{uuid.uuid4().hex[:10]}_{original_name}"
        destination = os.path.join(upload_root, storage_name)
        audio_bytes = audio.get("bytes")
        if audio_bytes:
            with open(destination, "wb") as output:
                output.write(audio_bytes)
        elif audio.get("path"):
            shutil.copyfile(audio["path"], destination)
        else:
            continue

        translation_input = [{"text": row["transcript"], "translation": ""}]
        translated = translate_segments(translation_input)[0].get("translation") or row["transcript"]
        recording = Recording(
            project_id=project.id,
            filename=original_name,
            storage_filename=storage_name,
            file_path=destination,
            file_size_bytes=os.path.getsize(destination),
            duration_seconds=float(row["duration_seconds"]),
            source_language="Auto-detect",
            target_language="English",
            status="ready",
        )
        db.add(recording)
        db.flush()
        db.add(TranscriptSegment(
            recording_id=recording.id,
            segment_order=1,
            start_time=0.0,
            end_time=float(row["duration_seconds"]),
            speaker_tag="Speaker 1",
            detected_language=LANGUAGE_NAMES.get(language, language),
            original_text=row["transcript"],
            translated_text=translated,
            confidence_score=0.98,
            is_flagged=False,
        ))
        selected_per_language[language] += 1
        if all(count == 2 for count in selected_per_language.values()):
            break

    if not any(selected_per_language.values()):
        raise RuntimeError("The selected dataset did not return usable audio files.")
    db.commit()
    db.refresh(project)
    return project, True
