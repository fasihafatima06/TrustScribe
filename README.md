# TrustScribe

> **AI-assisted transcript verification platform for multilingual, code-mixed Indian research interviews.**
> 
> Quality-checking layer between AI transcription and research-ready publications. Detects spoken languages (Hindi, Telugu, Tamil, code-mixed Hinglish/Tenglish), compares independent transcription engines with RapidFuzz alignment, flags suspicious lines and disagreements, links audio to exact timestamps, and records human verification audit trails.

---

## 🎯 What TrustScribe Does

1. **No-Login Direct Processing**: Upload audio/video or click a preloaded fieldwork sample—starts processing and transcribing immediately with zero friction.
2. **Dual-Engine Transcript Comparison**: Aligns independent ASR outputs (e.g. Sarvam AI & Gemini Audio) and highlights verbal negations, amount mismatches, and acoustic jitter.
3. **Evidence-Linked Verification Workspace**: Click any timestamp to play the recording at that exact millisecond. Edit original regional text and English translation inline.
4. **Audit Statuses**: Explicit verification flags:
   - `Unverified`: Initial AI output.
   - `Review suggested`: Flagged by RapidFuzz disagreement or acoustic ambiguity.
   - `Human-reviewed`: Explicit human verification with reviewer ID and UTC timestamp.
   - `Unclear`: Flagged acoustic ambiguity or speaker overlap.
5. **Reusable Research Glossary**: Maintain approved spellings for names, places, organizations, and schemes (e.g., *PhonePe*, *Gram Panchayat*, *Rythu Bharosa*, *DBT*, *UPI PIN*), with 1-click transcript auto-standardization.
6. **Research-Ready Exports**: Download certified reports in **Word (.docx)**, **PDF (.pdf)**, **Text (.txt)**, and **JSON (.json)** formats with metadata, insights, and audit records.

---

## 🚀 Quickstart: Running Locally

### Terminal 1: Backend API (FastAPI)
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
*API documentation available at `http://127.0.0.1:8000/docs`.*

### Terminal 2: Frontend (Live Server)
```powershell
cd frontend
python -m http.server 5500
```
Open **`http://localhost:5500`** in your browser.

---

## ⚙️ Architecture & Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend** | HTML5, Modern CSS, Vanilla ES6 JS | Landing page matching prototype design + Full Verification Workspace |
| **Backend** | Python 3.12, FastAPI, Uvicorn | Async REST API, audio streaming, and verification pipelines |
| **Transcription** | Sarvam AI & Google Gemini Audio | Independent ASR engines for Indian regional languages and code-switching |
| **Comparison** | RapidFuzz | Fuzzy token ratio, phonetic distance, and discrepancy detection |
| **Database** | SQLite + SQLAlchemy | Projects, recordings, segments, glossaries, insights, and audit history |
| **Reporting** | python-docx, ReportLab | Exportable research verification documents in DOCX, PDF, TXT, JSON |
