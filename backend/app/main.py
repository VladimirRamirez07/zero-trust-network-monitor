from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="Zero Trust Network Monitor",
    description="Real-time network traffic monitor with unauthorized device detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

@app.on_event("startup")
def startup_event():
    from app.core.database import init_db
    init_db()
    print("✅ Tablas creadas en PostgreSQL")

@app.get("/")
def root():
    return {"status": "Zero Trust Monitor running 🛡️"}