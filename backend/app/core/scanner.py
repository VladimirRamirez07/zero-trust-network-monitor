from scapy.all import ARP, Ether, srp, sniff
from scapy.layers.inet import IP, TCP, UDP
import socket
import struct
import os
from datetime import datetime

def get_mac_vendor(mac: str) -> str:
    """Obtiene el fabricante del dispositivo según su MAC address"""
    try:
        # Primero 3 octetos identifican el fabricante
        oui = mac.upper().replace(":", "")[:6]
        vendors = {
            "000C29": "VMware",
            "001A2B": "Cisco",
            "B827EB": "Raspberry Pi",
            "ACDE48": "Apple",
            "3C5AB4": "Google",
            "DC4F22": "Samsung",
        }
        return vendors.get(oui, "Unknown Vendor")
    except:
        return "Unknown"

def scan_network(network: str = "192.168.0.0/24") -> list:
    """
    Escanea la red usando ARP para descubrir dispositivos activos
    Requiere privilegios de administrador
    """
    discovered_devices = []

    try:
        # Crear paquete ARP broadcast
        arp_request = ARP(pdst=network)
        broadcast = Ether(dst="ff:ff:ff:ff:ff:ff")
        arp_packet = broadcast / arp_request

        # Enviar y recibir respuestas (timeout 3 segundos)
        answered, _ = srp(arp_packet, timeout=3, verbose=False)

        for sent, received in answered:
            device = {
                "ip_address": received.psrc,
                "mac_address": received.hwsrc,
                "vendor": get_mac_vendor(received.hwsrc),
                "hostname": get_hostname(received.psrc),
                "last_seen": datetime.utcnow().isoformat()
            }
            discovered_devices.append(device)

    except PermissionError:
        print("⚠️ Se requieren privilegios de administrador para escanear la red")
    except Exception as e:
        print(f"Error durante el escaneo: {e}")

    return discovered_devices

def get_hostname(ip: str) -> str:
    """Resuelve el hostname de una IP"""
    try:
        return socket.gethostbyaddr(ip)[0]
    except:
        return "Unknown"

def start_packet_sniffer(callback, interface: str = None):
    """
    Inicia el sniffer de paquetes en tiempo real
    callback: función que se ejecuta por cada paquete capturado
    """
    try:
        sniff(
            iface=interface,
            prn=callback,
            store=False,
            filter="ip"  # Solo captura paquetes IP
        )
    except PermissionError:
        print("⚠️ Se requieren privilegios de administrador para capturar paquetes")
    except Exception as e:
        print(f"Error en sniffer: {e}")

def analyze_packet(packet) -> dict | None:
    """
    Analiza un paquete capturado y extrae información relevante
    """
    if not packet.haslayer(IP):
        return None

    data = {
        "src_ip": packet[IP].src,
        "dst_ip": packet[IP].dst,
        "protocol": "TCP" if packet.haslayer(TCP) else "UDP" if packet.haslayer(UDP) else "OTHER",
        "timestamp": datetime.utcnow().isoformat(),
        "size": len(packet)
    }

    if packet.haslayer(TCP):
        data["src_port"] = packet[TCP].sport
        data["dst_port"] = packet[TCP].dport

    elif packet.haslayer(UDP):
        data["src_port"] = packet[UDP].sport
        data["dst_port"] = packet[UDP].dport

    return data