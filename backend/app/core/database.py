from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.device import Base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/zerotrust"
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def init_db():
    """Crea todas las tablas en PostgreSQL si no existen"""
    Base.metadata.create_all(bind=engine)
    print("✅ Base de datos inicializada")