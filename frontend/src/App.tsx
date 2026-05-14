import { useState, useEffect, useRef } from 'react'
import { Shield, Wifi, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import axios from 'axios'

const API = 'http://localhost:8001/api/v1'

const colors = {
  bg: '#030712',
  card: '#111827',
  border: '#1f2937',
  green: '#34d399',
  red: '#f87171',
  orange: '#fb923c',
  yellow: '#fbbf24',
  blue: '#60a5fa',
  gray: '#9ca3af',
  darkGray: '#374151',
}

const styles: Record<string, React.CSSProperties> = {
  app: { minHeight: '100vh', background: colors.bg, color: 'white', padding: '24px', fontFamily: 'sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
  subtitle: { color: colors.gray, fontSize: '14px', margin: 0 },
  scanBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: '#16a34a', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' },
  statCard: { background: colors.card, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` },
  statHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { color: colors.gray, fontSize: '13px' },
  statValue: { fontSize: '32px', fontWeight: 'bold', marginTop: '8px' },
  chartCard: { background: colors.card, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, marginBottom: '32px' },
  chartTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '16px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' },
  panel: { background: colors.card, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` },
  panelTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '16px' },
  emptyMsg: { color: colors.gray, textAlign: 'center' as const, padding: '32px 0', fontSize: '14px' },
  deviceList: { display: 'flex', flexDirection: 'column' as const, gap: '12px', maxHeight: '320px', overflowY: 'auto' as const },
  deviceItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.darkGray, borderRadius: '8px', padding: '12px' },
  deviceIP: { fontFamily: 'monospace', fontSize: '13px', color: colors.green },
  deviceMAC: { fontSize: '11px', color: colors.gray },
  deviceVendor: { fontSize: '11px', color: '#6b7280' },
  authBtn: { fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', color: 'white' },
  incidentItem: { background: colors.darkGray, borderRadius: '8px', padding: '12px', marginBottom: '12px' },
  badge: { padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  alertCard: { background: colors.card, borderRadius: '12px', padding: '16px', border: `1px solid #92400e` },
  alertTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: colors.yellow },
}

interface Device {
  id: number
  mac_address: string
  ip_address: string
  hostname: string
  vendor: string
  is_authorized: boolean
  last_seen: string
}

interface Incident {
  id: number
  device_mac: string
  incident_type: string
  description: string
  severity: string
  resolved: boolean
  created_at: string
}

const severityColors: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#2563eb',
}

export default function App() {
  const [devices, setDevices] = useState<Device[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [trafficData, setTrafficData] = useState<{ time: string; packets: number }[]>([])
  const [scanning, setScanning] = useState(false)
  const [alerts, setAlerts] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    fetchDevices()
    fetchIncidents()
    connectWebSocket()
    return () => wsRef.current?.close()
  }, [])

  const fetchDevices = async () => {
    try {
      const res = await axios.get(`${API}/devices`)
      setDevices(res.data)
    } catch { }
  }

  const fetchIncidents = async () => {
    try {
      const res = await axios.get(`${API}/incidents`)
      setIncidents(res.data)
    } catch { }
  }

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:8001/api/v1/ws/alerts')
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'new_device') {
          setAlerts(prev => [`🚨 Nuevo dispositivo: ${data.data.ip_address}`, ...prev.slice(0, 4)])
          fetchDevices()
        }
      }
      wsRef.current = ws
    } catch { }
  }

  const handleScan = async () => {
    setScanning(true)
    try {
      const res = await axios.post(`${API}/scan`)
      setAlerts(prev => [`✅ Escaneo completado: ${res.data.new_devices} nuevos dispositivos`, ...prev.slice(0, 4)])
      fetchDevices()
    } catch {
      setAlerts(prev => ['⚠️ Error al escanear', ...prev.slice(0, 4)])
    }
    setScanning(false)
  }

  const handleAuthorize = async (mac: string) => {
    try { await axios.post(`${API}/devices/${mac}/authorize`); fetchDevices() } catch { }
  }

  const handleRevoke = async (mac: string) => {
    try { await axios.post(`${API}/devices/${mac}/revoke`); fetchDevices() } catch { }
  }

  const handleResolve = async (id: number) => {
    try { await axios.post(`${API}/incidents/${id}/resolve`); fetchIncidents() } catch { }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString()
      setTrafficData(prev => [...prev.slice(-19), { time: now, packets: Math.floor(Math.random() * 300) + 50 }])
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const unauthorized = devices.filter(d => !d.is_authorized)
  const activeIncidents = incidents.filter(i => !i.resolved)

  return (
    <div style={styles.app}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Shield color={colors.green} size={32} />
          <div>
            <h1 style={styles.title}>Zero Trust Network Monitor</h1>
            <p style={styles.subtitle}>Monitoreo en tiempo real de tu red LAN</p>
          </div>
        </div>
        <button style={styles.scanBtn} onClick={handleScan} disabled={scanning}>
          <RefreshCw size={16} style={{ animation: scanning ? 'spin 1s linear infinite' : 'none' }} />
          {scanning ? 'Escaneando...' : 'Escanear Red'}
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        {[
          { label: 'Dispositivos', value: devices.length, icon: <Wifi color={colors.blue} size={20} /> },
          { label: 'No Autorizados', value: unauthorized.length, icon: <XCircle color={colors.red} size={20} /> },
          { label: 'Incidentes Activos', value: activeIncidents.length, icon: <AlertTriangle color={colors.orange} size={20} /> },
          { label: 'Resueltos', value: incidents.filter(i => i.resolved).length, icon: <CheckCircle color={colors.green} size={20} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} style={styles.statCard}>
            <div style={styles.statHeader}>
              <span style={styles.statLabel}>{label}</span>
              {icon}
            </div>
            <div style={styles.statValue}>{value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={styles.chartCard}>
        <div style={styles.chartTitle}>Tráfico de Red en Tiempo Real</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.darkGray} />
            <XAxis dataKey="time" tick={{ fill: colors.gray, fontSize: 11 }} />
            <YAxis tick={{ fill: colors.gray, fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }} />
            <Line type="monotone" dataKey="packets" stroke={colors.green} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Devices & Incidents */}
      <div style={styles.grid2}>
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Dispositivos en la Red</div>
          {devices.length === 0
            ? <div style={styles.emptyMsg}>No hay dispositivos detectados.<br />Ejecuta un escaneo.</div>
            : <div style={styles.deviceList}>
              {devices.map(device => (
                <div key={device.id} style={styles.deviceItem}>
                  <div>
                    <div style={styles.deviceIP}>{device.ip_address}</div>
                    <div style={styles.deviceMAC}>{device.mac_address}</div>
                    <div style={styles.deviceVendor}>{device.vendor}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {device.is_authorized ? <CheckCircle color={colors.green} size={16} /> : <XCircle color={colors.red} size={16} />}
                    <button
                      style={{ ...styles.authBtn, background: device.is_authorized ? '#7f1d1d' : '#14532d' }}
                      onClick={() => device.is_authorized ? handleRevoke(device.mac_address) : handleAuthorize(device.mac_address)}
                    >
                      {device.is_authorized ? 'Revocar' : 'Autorizar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>

        <div style={styles.panel}>
          <div style={styles.panelTitle}>Incidentes de Seguridad</div>
          {incidents.length === 0
            ? <div style={styles.emptyMsg}>No hay incidentes registrados.</div>
            : <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {incidents.map(incident => (
                <div key={incident.id} style={{ ...styles.incidentItem, borderLeft: `4px solid ${incident.resolved ? colors.darkGray : colors.red}`, opacity: incident.resolved ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center' }}>
                        <span style={{ ...styles.badge, background: severityColors[incident.severity] || '#6b7280' }}>{incident.severity.toUpperCase()}</span>
                        <span style={{ fontSize: '11px', color: colors.gray }}>{incident.incident_type}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#d1d5db' }}>{incident.description}</div>
                    </div>
                    {!incident.resolved &&
                      <button style={{ ...styles.authBtn, background: colors.darkGray }} onClick={() => handleResolve(incident.id)}>Resolver</button>
                    }
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 &&
        <div style={styles.alertCard}>
          <div style={styles.alertTitle}>⚡ Alertas Recientes</div>
          {alerts.map((alert, i) => (
            <div key={i} style={{ fontSize: '13px', color: '#d1d5db', fontFamily: 'monospace', marginBottom: '4px' }}>{alert}</div>
          ))}
        </div>
      }
    </div>
  )
}