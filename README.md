# 🛡️ Zero Trust Network Monitor

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![Scapy](https://img.shields.io/badge/Scapy-2.5-orange)

Real-time network traffic monitor with unauthorized device detection, anomaly alerts, and incident reporting dashboard. Built for cybersecurity portfolio demonstration.

---

## 🎯 Features

- **ARP Network Scanning** — discovers all active devices on the LAN using Scapy
- **Zero Trust Device Authorization** — whitelist/blacklist devices by MAC address
- **Real-time Alerts** — WebSocket-powered instant notifications for new devices
- **Anomaly Detection** — detects port scans, suspicious ports, and traffic floods
- **Incident Management** — log, track and resolve security incidents
- **Multi-interface Support** — scan any network interface (Wi-Fi, Ethernet, etc.)
- **Live Traffic Chart** — real-time network traffic visualization
- **REST API** — full FastAPI backend with auto-generated docs at `/docs`

---

## 🏗️ Architecture
zero-trust-network-monitor/
├── backend/                  # FastAPI + Scapy
│   └── app/
│       ├── api/routes.py     # REST endpoints + WebSocket
│       ├── core/
│       │   ├── scanner.py    # ARP scanning & packet capture
│       │   └── database.py   # PostgreSQL connection
│       ├── models/device.py  # SQLAlchemy models
│       └── services/
│           └── detector.py   # Anomaly detection engine
├── frontend/                 # React + TypeScript
│   └── src/
│       └── App.tsx           # Dashboard UI
├── docker-compose.yml        # PostgreSQL container
└── .env.example              # Environment variables
---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop
- [Npcap](https://npcap.com) (Windows) or libpcap (Linux/macOS)
- Administrator/root privileges (required for ARP scanning)

### 1. Clone the repository

```bash
git clone https://github.com/VladimirRamirez07/zero-trust-network-monitor.git
cd zero-trust-network-monitor
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set your NETWORK_RANGE (e.g. 192.168.0.0/24)
```

### 3. Start PostgreSQL

```bash
docker-compose up -d db
```

### 4. Start the backend (run as Administrator)

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

### 6. Open the dashboard
http://localhost:5173
---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/devices` | List all detected devices |
| `GET` | `/api/v1/devices/unauthorized` | List unauthorized devices |
| `POST` | `/api/v1/devices/{mac}/authorize` | Authorize a device |
| `POST` | `/api/v1/devices/{mac}/revoke` | Revoke device authorization |
| `POST` | `/api/v1/scan?network=x.x.x.x/24` | Trigger ARP network scan |
| `GET` | `/api/v1/incidents` | List all incidents |
| `POST` | `/api/v1/incidents/{id}/resolve` | Resolve an incident |
| `GET` | `/api/v1/interfaces` | List available network interfaces |
| `WS` | `/api/v1/ws/alerts` | WebSocket for real-time alerts |

Full interactive docs available at `http://localhost:8001/docs`

---

## 🔍 How It Works

### ARP Scanning
Scapy sends ARP broadcast packets to the entire subnet. Every device that responds is recorded with its IP, MAC address, vendor, and hostname.

### Zero Trust Model
Every device starts as **unauthorized**. The administrator must explicitly whitelist each device. Any new device triggers an instant alert via WebSocket.

### Anomaly Detection
The detector engine monitors for:
- 🔴 **Unauthorized devices** — MAC not in whitelist
- 🟠 **Suspicious ports** — access to ports like 4444, 23, 3389
- 🟡 **Traffic floods** — more than 500 packets/min from one IP

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Packet Capture | Scapy 2.5 |
| Backend | FastAPI + Uvicorn |
| Database | PostgreSQL 15 + SQLAlchemy |
| Real-time | WebSockets |
| Frontend | React 18 + TypeScript |
| Charts | Recharts |
| Icons | Lucide React |
| Container | Docker Compose |

---

## ⚠️ Disclaimer

This tool is intended for **authorized network monitoring only**. Only use it on networks you own or have explicit permission to monitor. Unauthorized network scanning may be illegal in your jurisdiction.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.