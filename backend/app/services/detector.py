from datetime import datetime, timedelta
from collections import defaultdict
from app.models.device import Device, Incident

# Umbral de paquetes por minuto para considerar comportamiento anómalo
ANOMALY_THRESHOLD = 500
# Puertos considerados críticos/sospechosos
SUSPICIOUS_PORTS = {22, 23, 3389, 4444, 5900, 6667, 8080, 31337}

class AnomalyDetector:
    def __init__(self):
        # Contador de paquetes por IP en ventana de tiempo
        self.packet_counter = defaultdict(list)
        # MACs autorizadas (se carga desde DB al iniciar)
        self.authorized_macs = set()
        # Incidentes generados en esta sesión
        self.incidents = []

    def load_authorized_devices(self, db_session):
        """Carga las MACs autorizadas desde PostgreSQL"""
        try:
            authorized = db_session.query(Device).filter(
                Device.is_authorized == True
            ).all()
            self.authorized_macs = {d.mac_address for d in authorized}
            print(f"✅ {len(self.authorized_macs)} dispositivos autorizados cargados")
        except Exception as e:
            print(f"Error cargando dispositivos: {e}")

    def check_unauthorized_device(self, mac: str, ip: str) -> dict | None:
        """
        Verifica si un dispositivo NO está en la lista blanca
        Retorna un incidente si es no autorizado
        """
        if mac not in self.authorized_macs:
            incident = {
                "device_mac": mac,
                "incident_type": "unauthorized",
                "description": f"Dispositivo no autorizado detectado: MAC {mac} - IP {ip}",
                "severity": "high",
                "created_at": datetime.utcnow().isoformat()
            }
            self.incidents.append(incident)
            return incident
        return None

    def check_port_scan(self, src_ip: str, dst_port: int) -> dict | None:
        """
        Detecta si una IP está intentando acceder a puertos sospechosos
        """
        if dst_port in SUSPICIOUS_PORTS:
            incident = {
                "device_mac": "unknown",
                "incident_type": "anomaly",
                "description": f"Acceso a puerto sospechoso {dst_port} desde {src_ip}",
                "severity": "critical" if dst_port in {4444, 31337} else "medium",
                "created_at": datetime.utcnow().isoformat()
            }
            self.incidents.append(incident)
            return incident
        return None

    def check_traffic_anomaly(self, src_ip: str) -> dict | None:
        """
        Detecta tráfico anómalo por volumen (posible flood o escaneo)
        Ventana de tiempo: último minuto
        """
        now = datetime.utcnow()
        one_minute_ago = now - timedelta(minutes=1)

        # Limpiar registros viejos
        self.packet_counter[src_ip] = [
            t for t in self.packet_counter[src_ip]
            if t > one_minute_ago
        ]

        # Registrar paquete actual
        self.packet_counter[src_ip].append(now)

        # Verificar si supera el umbral
        count = len(self.packet_counter[src_ip])
        if count > ANOMALY_THRESHOLD:
            incident = {
                "device_mac": "unknown",
                "incident_type": "anomaly",
                "description": f"Tráfico anómalo desde {src_ip}: {count} paquetes/min",
                "severity": "high",
                "created_at": datetime.utcnow().isoformat()
            }
            self.incidents.append(incident)
            # Reset contador para no spam de alertas
            self.packet_counter[src_ip] = []
            return incident
        return None

    def analyze(self, packet_data: dict, mac: str = None) -> list:
        """
        Punto de entrada principal — analiza un paquete y retorna
        lista de incidentes detectados (puede ser vacía)
        """
        detected = []

        # Verificar dispositivo no autorizado
        if mac:
            incident = self.check_unauthorized_device(mac, packet_data.get("src_ip", ""))
            if incident:
                detected.append(incident)

        # Verificar puerto sospechoso
        if "dst_port" in packet_data:
            incident = self.check_port_scan(
                packet_data["src_ip"],
                packet_data["dst_port"]
            )
            if incident:
                detected.append(incident)

        # Verificar volumen de tráfico
        incident = self.check_traffic_anomaly(packet_data["src_ip"])
        if incident:
            detected.append(incident)

        return detected

# Instancia global del detector
detector = AnomalyDetector()