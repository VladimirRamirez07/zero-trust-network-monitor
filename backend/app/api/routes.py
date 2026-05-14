from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.models.device import Device, Incident, Base
from app.services.detector import detector
from app.core.scanner import scan_network, analyze_packet, start_packet_sniffer
from datetime import datetime
import asyncio
import json

router = APIRouter()

# ─── Dependency: sesión de base de datos ─────────────────────────────────────

def get_db():
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── Gestor de conexiones WebSocket activas ───────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()


# ─── Endpoints de Dispositivos ────────────────────────────────────────────────

@router.get("/devices")
def get_devices(db: Session = Depends(get_db)):
    return db.query(Device).all()

@router.get("/devices/unauthorized")
def get_unauthorized(db: Session = Depends(get_db)):
    return db.query(Device).filter(Device.is_authorized == False).all()

@router.post("/devices/{mac}/authorize")
def authorize_device(mac: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.mac_address == mac).first()
    if not device:
        return {"error": "Dispositivo no encontrado"}
    device.is_authorized = True
    db.commit()
    detector.authorized_macs.add(mac)
    return {"status": "autorizado", "mac": mac}

@router.post("/devices/{mac}/revoke")
def revoke_device(mac: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.mac_address == mac).first()
    if not device:
        return {"error": "Dispositivo no encontrado"}
    device.is_authorized = False
    db.commit()
    detector.authorized_macs.discard(mac)
    return {"status": "revocado", "mac": mac}


# ─── Endpoints de Escaneo ─────────────────────────────────────────────────────

@router.post("/scan")
async def trigger_scan(db: Session = Depends(get_db)):
    devices = scan_network()
    new_count = 0

    for d in devices:
        existing = db.query(Device).filter(
            Device.mac_address == d["mac_address"]
        ).first()

        if not existing:
            new_device = Device(**d)
            db.add(new_device)
            new_count += 1
            await manager.broadcast({
                "type": "new_device",
                "data": d
            })
        else:
            existing.last_seen = datetime.utcnow()
            existing.ip_address = d["ip_address"]

    db.commit()
    return {
        "scanned": len(devices),
        "new_devices": new_count
    }


# ─── Endpoints de Incidentes ──────────────────────────────────────────────────

@router.get("/incidents")
def get_incidents(db: Session = Depends(get_db)):
    return db.query(Incident).order_by(Incident.created_at.desc()).all()

@router.post("/incidents/{id}/resolve")
def resolve_incident(id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        return {"error": "Incidente no encontrado"}
    incident.resolved = True
    db.commit()
    return {"status": "resuelto", "id": id}


# ─── WebSocket para alertas en tiempo real ───────────────────────────────────

@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)