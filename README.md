# TrustScribe

> **AI-assisted transcript verification platform for multilingual, code-mixed Indian research interviews.**
> 
> A quality-checking layer between AI transcription and research-ready publications. Detects spoken Indian languages (Hindi, Telugu, Tamil, and code-mixed Hinglish/Tenglish), compares independent transcription engines with RapidFuzz alignment, selectively flags suspicious lines and disagreements, links audio to exact timestamps, and records human verification audit trails.

---

## 🎯 Key Capabilities & Highlights

1. **Zero-Friction / Direct Processing**:
   - No login or registration required. Researchers can immediately upload audio/video files or explore seeded fieldwork interviews.
2. **Realistic 28-Minute Fieldwork Interview**:
   - Seeded with an authentic **28:45** qualitative fieldwork interview on rural digital payments and Direct Benefit Transfers (DBT) in Telugu + English.
3. **Smart Selective Flagging (80%+ Review Time Saved)**:
   - Instead of overwhelming researchers by flagging every line, TrustScribe isolates the small fraction of lines with discrepancies (e.g., 3 flagged lines out of 17 segments), letting researchers focus only on low-confidence or conflicting segments.
4. **Dual-Engine Transcript Comparison**:
   - Aligns independent transcription outputs (Sarvam AI & Google Gemini Audio) and flags critical semantic differences such as verbal negations, amount mismatches, and acoustic jitter.
5. **Two-Column Evidence-Linked Workspace**:
   - **Left Column**: Interactive transcript cards with pastel speaker tags (`Researcher`, `Participant`), timestamp pills, inline editing, and 1-click verification (`✓ Mark as Reviewed`).
   - **Right Sidebar**: Inspector tabs featuring:
     - **Tools & Review**: Interactive confidence slider (25%–85%), live search & replace, and verification progress metrics.
     - **AI Insights**: Plain-English fieldwork takeaways, discrepancy summaries, and minutes saved calculations.
     - **Glossary**: Project terminology and organization names with one-click standardizations.
6. **Integrated Audio & Video Player**:
   - Sticky player with Play/Pause/Stop, 1.0x / 1.5x / 2.0x playback speed controls, and a precise timeline scrubber (`00:00 / 28:45`).
7. **Research-Ready Verification Reports**:
   - Download audit-ready verification reports in 4 formats: **Word doc (.docx)**, **PDF (.pdf)**, **Text (.txt)**, and **JSON (.json)** with timestamps, dual-engine discrepancies, and human verification signatures.

---

## 🌐 Live Deployments

- **Frontend (Vercel)**: Configured with `vercel.json` rewrites and automatic backend resolution.
- **Backend (Render)**: Hosted at [`https://trustscribe.onrender.com`](https://trustscribe.onrender.com) (configured with `render.yaml` and `Procfile`).

---

## ⚙️ Architecture & Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend** | HTML5, Modern CSS, Vanilla ES6 JavaScript | Zero-dependency, responsive two-column verification workspace and landing page |
| **Backend** | Python 3.11+, FastAPI, Uvicorn | Async REST API, audio streaming, export generators, and verification pipeline |
| **Transcription** | Sarvam AI & Google Gemini Audio | Dual independent speech-to-text engines with fallback handling |
| **Comparison** | RapidFuzz | Fuzzy string matching, token alignment, and selective discrepancy scoring |
| **Storage & Database** | SQLite + SQLAlchemy | Projects, recordings, segments, glossaries, insights, and audit records |
| **Export Formats** | `python-docx`, ReportLab | Formatted DOCX, PDF, TXT, and JSON report generation |
| **Hosting & CI/CD** | Vercel (Frontend) & Render (Backend) | Automatic deployment with dynamic backend URL discovery |

---

## 🚀 Running Locally

### 1. Backend Setup (FastAPI)
```powershell
# Navigate to backend directory
cd backend

# Create and activate virtual environment (if not already created)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
- API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
- Audio Streaming Endpoint: `http://127.0.0.1:8000/stream-audio/`

### 2. Frontend Setup
In a second terminal:
```powershell
cd frontend
python -m http.server 5500
```
Open **`http://localhost:5500`** in your browser.

---

## 📂 Project Structure

```text
TrustScribe/
├── backend/
│   ├── app/
│   │   ├── routers/            # FastAPI route handlers (uploads, transcript, insights, etc.)
│   │   ├── services/           # Transcription, RapidFuzz comparison, insights, export generators
│   │   ├── database.py         # SQLAlchemy engine and session setup
│   │   ├── models.py           # Database models (Recording, TranscriptSegment, Insight, etc.)
│   │   ├── seed.py             # Seed data with 28-min research interview & audio samples
│   │   └── main.py             # FastAPI app initialization and CORS configuration
│   ├── uploads/                # Audio/video files and preloaded spoken sample WAVs
│   ├── Procfile                # Render process configuration
│   └── requirements.txt        # Python package dependencies
├── frontend/
│   ├── css/
│   │   └── style.css           # Workspace styles, 2x2 download modal, audio player, theme tokens
│   ├── js/
│   │   ├── api.js              # API client with automatic production/local URL resolution
│   │   ├── landing.js          # Interactive landing page audio player & upload handler
│   │   └── transcript.js       # Two-column workspace logic, confidence slider, search/replace
│   ├── index.html              # Landing page
│   ├── dashboard.html          # Projects overview dashboard
│   ├── transcript.html         # Verification workspace
│   └── vercel.json             # Vercel routing and proxy rules
├── render.yaml                 # Render blueprint specification
├── vercel.json                 # Root Vercel deployment configuration
└── README.md
```

---

## 💰 Pricing Structure

- **Free Tier**: ₹0 (60 audio minutes/month, 2 projects)
- **Researcher Tier**: ₹799 / month (Monthly) or ₹599 / month (Annual) — 300 minutes, 10 projects
- **Pro Tier**: ₹2,499 / month (Monthly) or ₹2,299 / month (Annual) — 1,200 minutes, 50 projects
