from sqlalchemy import Column, String, Boolean, DateTime, Integer
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    mac_address = Column(String, unique=True, index=True, nullable=False)
    ip_address = Column(String, nullable=False)
    hostname = Column(String, nullable=True)
    vendor = Column(String, nullable=True)
    is_authorized = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    device_mac = Column(String, nullable=False)
    incident_type = Column(String, nullable=False)  # "unauthorized", "anomaly", "new_device"
    description = Column(String, nullable=False)
    severity = Column(String, default="medium")     # "low", "medium", "high", "critical"
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)