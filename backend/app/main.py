import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base, SessionLocal
from .models import *
from .routers import auth, projects, uploads, transcript, insights, explore, glossary, contact
from .seed import seed_database_samples

# Load local environment variables
load_dotenv()

# Initialize all database tables on launch
Base.metadata.create_all(bind=engine)

# Seed realistic research samples on startup
try:
    with SessionLocal() as db:
        seed_database_samples(db)
except Exception as e:
    print(f"[TrustScribe Seed Notice] {e}")

app = FastAPI(
    title="TrustScribe API",
    description="Cross-engine transcript verification and quality audit platform for multilingual Indian research interviews",
    version="2.0.0"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local audio stream directory
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/stream-audio", StaticFiles(directory=UPLOAD_DIR), name="audio")

# Mount Routers
app.include_router(uploads.router)
app.include_router(transcript.router)
app.include_router(glossary.router)
app.include_router(insights.router)
app.include_router(contact.router)
app.include_router(projects.router)
app.include_router(auth.router)
app.include_router(explore.router)

@app.get("/")
def api_root():
    return {
        "service": "TrustScribe API",
        "status": "running",
        "docs": "/docs",
        "frontend": "http://localhost:5500"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "TrustScribe Core Verification Engine"}
