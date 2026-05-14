import { useState, useEffect, useRef } from 'react'
import { Shield, Wifi, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import axios from 'axios'

const API = 'http://localhost:8000/api/v1'

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

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-black',
    low: 'bg-blue-500 text-white',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-bold ${colors[severity] || 'bg-gray-500 text-white'}`}>
      {severity.toUpperCase()}
    </span>
  )
}

export default function App() {
  const [devices, setDevices] = useState<Device[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [trafficData, setTrafficData] = useState<{ time: string; packets: number }[]>([])
  const [scanning, setScanning] = useState(false)
  const [alerts, setAlerts] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  // Cargar datos iniciales
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
    } catch {
      console.log('Backend no disponible aún')
    }
  }

  const fetchIncidents = async () => {
    try {
      const res = await axios.get(`${API}/incidents`)
      setIncidents(res.data)
    } catch {
      console.log('Backend no disponible aún')
    }
  }

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:8000/api/v1/ws/alerts')
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'new_device') {
          setAlerts(prev => [`🚨 Nuevo dispositivo: ${data.data.ip_address}`, ...prev.slice(0, 4)])
          fetchDevices()
        }
      }
      wsRef.current = ws
    } catch {
      console.log('WebSocket no disponible aún')
    }
  }

  const handleScan = async () => {
    setScanning(true)
    try {
      const res = await axios.post(`${API}/scan`)
      setAlerts(prev => [`✅ Escaneo completado: ${res.data.new_devices} nuevos dispositivos`, ...prev.slice(0, 4)])
      fetchDevices()
    } catch {
      setAlerts(prev => ['⚠️ Backend no disponible', ...prev.slice(0, 4)])
    }
    setScanning(false)
  }

  const handleAuthorize = async (mac: string) => {
    try {
      await axios.post(`${API}/devices/${mac}/authorize`)
      fetchDevices()
    } catch {
      console.log('Error al autorizar')
    }
  }

  const handleRevoke = async (mac: string) => {
    try {
      await axios.post(`${API}/devices/${mac}/revoke`)
      fetchDevices()
    } catch {
      console.log('Error al revocar')
    }
  }

  const handleResolve = async (id: number) => {
    try {
      await axios.post(`${API}/incidents/${id}/resolve`)
      fetchIncidents()
    } catch {
      console.log('Error al resolver')
    }
  }

  // Simular datos de tráfico para la gráfica
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString()
      setTrafficData(prev => [
        ...prev.slice(-19),
        { time: now, packets: Math.floor(Math.random() * 300) + 50 }
      ])
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const unauthorized = devices.filter(d => !d.is_authorized)
  const activeIncidents = incidents.filter(i => !i.resolved)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="text-green-400 w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Zero Trust Network Monitor</h1>
            <p className="text-gray-400 text-sm">Monitoreo en tiempo real de tu red LAN</p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-semibold transition"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Escaneando...' : 'Escanear Red'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Dispositivos', value: devices.length, icon: Wifi, color: 'text-blue-400' },
          { label: 'No Autorizados', value: unauthorized.length, icon: XCircle, color: 'text-red-400' },
          { label: 'Incidentes Activos', value: activeIncidents.length, icon: AlertTriangle, color: 'text-orange-400' },
          { label: 'Resueltos', value: incidents.filter(i => i.resolved).length, icon: CheckCircle, color: 'text-green-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">{label}</span>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
        ))}
      </div>

      {/* Gráfica de tráfico */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-8">
        <h2 className="text-lg font-semibold mb-4">Tráfico de Red en Tiempo Real</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
            <Line type="monotone" dataKey="packets" stroke="#34D399" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

        {/* Dispositivos */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4">Dispositivos en la Red</h2>
          {devices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay dispositivos detectados.<br/>Ejecuta un escaneo.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {devices.map(device => (
                <div key={device.id} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                  <div>
                    <p className="font-mono text-sm text-green-400">{device.ip_address}</p>
                    <p className="text-xs text-gray-400">{device.mac_address}</p>
                    <p className="text-xs text-gray-500">{device.vendor}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {device.is_authorized
                      ? <CheckCircle className="text-green-400 w-4 h-4" />
                      : <XCircle className="text-red-400 w-4 h-4" />
                    }
                    <button
                      onClick={() => device.is_authorized ? handleRevoke(device.mac_address) : handleAuthorize(device.mac_address)}
                      className={`text-xs px-2 py-1 rounded ${device.is_authorized ? 'bg-red-900 hover:bg-red-800' : 'bg-green-900 hover:bg-green-800'}`}
                    >
                      {device.is_authorized ? 'Revocar' : 'Autorizar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incidentes */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4">Incidentes de Seguridad</h2>
          {incidents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay incidentes registrados.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {incidents.map(incident => (
                <div key={incident.id} className={`bg-gray-800 rounded-lg p-3 border-l-4 ${incident.resolved ? 'border-gray-600 opacity-60' : 'border-red-500'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={incident.severity} />
                        <span className="text-xs text-gray-400">{incident.incident_type}</span>
                      </div>
                      <p className="text-xs text-gray-300">{incident.description}</p>
                    </div>
                    {!incident.resolved && (
                      <button
                        onClick={() => handleResolve(incident.id)}
                        className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded shrink-0"
                      >
                        Resolver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alertas en tiempo real */}
      {alerts.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 border border-yellow-800">
          <h2 className="text-lg font-semibold mb-3 text-yellow-400">⚡ Alertas Recientes</h2>
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <p key={i} className="text-sm text-gray-300 font-mono">{alert}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}