import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  DoorOpen,
  Gauge,
  Guitar,
  LogOut,
  PackageCheck,
  Plus,
  Users,
  BarChart3,
} from 'lucide-react';

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import StatisticsView from './StatisticsView';
import { formatDate, isWithinOperatingHours, isValidOperatingDate, OPERATING_DATE_ERROR, OPERATING_DATE_WARNING_STYLE } from './utils';
import { Badge, Field, TextInput, SelectInput, Message } from './components';

const locales = {
  'es': es,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function resolveApiUrl() {
  const configured = process.env.REACT_APP_API_URL;
  if (configured && configured !== 'http://localhost/api') return configured;
  if (window.location.port === '3001') return 'http://localhost:5000/api';
  return `${window.location.origin}/api`;
}

const API_URL = resolveApiUrl();

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge, adminOnly: false },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays, adminOnly: false },
  { id: 'reservas', label: 'Reservas', icon: Plus, adminOnly: false },
  { id: 'prestamos', label: 'Préstamos', icon: PackageCheck, adminOnly: false },
  { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3, adminOnly: false },
  { id: 'inventario', label: 'Inventario', icon: Guitar, adminOnly: false },
  { id: 'socios', label: 'Socios', icon: Users, adminOnly: true },
  { id: 'salas', label: 'Salas', icon: DoorOpen, adminOnly: true },
  { id: 'perfil', label: 'Mi Perfil', icon: Users, adminOnly: false },
];

const emptyReserva = {
  user_id: '',
  sala_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  terminos_aceptados: true,
};

const emptyPrestamo = {
  user_id: '',
  inventario_id: '',
  motivo: '',
  documento_garantia: 'Cédula de Identidad',
  fecha_salida: '',
  fecha_limite: '',
  terminos_aceptados: true,
};

const emptySocio = {
  nombre_completo: '',
  email_institucional: '',
  telefono_whatsapp: '',
  nivel_habilidad: 'PRINCIPIANTE',
  rol: 'SOCIO',
  password: '',
};

const emptyInstrumento = {
  nombre: '',
  tipo: 'Guitarra Eléctrica',
  marca: '',
  modelo: '',
  numero_serie: '',
  estado: 'DISPONIBLE',
  ubicacion: '',
};

const emptySala = {
  nombre: '',
  tipo: 'CUBICULO',
  capacidad: 4,
  estado: 'ACTIVA',
};


function CountdownTimer({ fechaLimite }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgency, setUrgency] = useState('ok');

  useEffect(() => {
    function update() {
      const diff = new Date(fechaLimite) - new Date();
      if (diff <= 0) { setTimeLeft('VENCIDO'); setUrgency('expired'); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setUrgency(diff < 4 * 3600000 ? 'critical' : diff < 24 * 3600000 ? 'warning' : 'ok');
      setTimeLeft(days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [fechaLimite]);

  const colors = { ok: '#22c55e', warning: '#f59e0b', critical: '#ef4444', expired: '#dc2626' };
  return (
    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: colors[urgency] || '#888' }}>
      ⏱ {timeLeft}
    </span>
  );
}


function OperatingHoursAlert() {
  const now = new Date();
  const day = now.getDay();
  const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][day];
  return (
    <div style={{
      background: '#fef3c7',
      border: '1.5px solid #f59e0b',
      borderRadius: '10px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      marginBottom: '16px',
    }}>
      <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🔒</span>
      <div>
        <p style={{ fontWeight: 700, color: '#92400e', margin: '0 0 2px', fontSize: '0.92rem' }}>
          Fuera del horario de atención — {dayName}
        </p>
        <p style={{ color: '#b45309', margin: 0, fontSize: '0.82rem', lineHeight: 1.4 }}>
          Las reservas, préstamos y devoluciones solo se gestionan de <strong>lunes a sábado hasta las 12:00 del mediodía</strong>.
          Vuelve en horario hábil para continuar.
        </p>
      </div>
    </div>
  );
}

function exportToCSV(data, filename) {
  const headers = Object.keys(data[0] || {}).join(',');
  const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(','));
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function ReservaEventModal({ event, currentUser, onClose }) {
  if (!event) return null;
  const isOwn = event.socio_id === currentUser?.id;
  const isOcupado = event.nombre_completo === 'Ocupado';
  const duracionMs = event.end - event.start;
  const horas = Math.floor(duracionMs / 3600000);
  const mins = Math.floor((duracionMs % 3600000) / 60000);
  const duracion = horas > 0 ? `${horas}h ${mins > 0 ? mins + 'm' : ''}`.trim() : `${mins}m`;

  const fmt = (d) => d.toLocaleString('es-EC', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fmtTime = (d) => d.toLocaleString('es-EC', { hour: '2-digit', minute: '2-digit' });

  const gradients = {
    own:  'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
    other:'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 60%, #2563eb 100%)',
    busy: 'linear-gradient(135deg, #3b0764 0%, #6d28d9 60%, #7c3aed 100%)',
  };
  const gradient = isOwn ? gradients.own : isOcupado ? gradients.busy : gradients.other;

  const estadoColor = { CONFIRMADA: '#10b981', CANCELADA: '#ef4444', PENDIENTE: '#f59e0b' };
  const estadoBg   = { CONFIRMADA: 'rgba(16,185,129,0.18)', CANCELADA: 'rgba(239,68,68,0.18)', PENDIENTE: 'rgba(245,158,11,0.18)' };
  const estadoKey  = event.estado || 'CONFIRMADA';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(10,15,30,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.18s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
        .rem-card { animation: fadeIn 0.2s cubic-bezier(.22,1,.36,1) both; }
        .rem-close:hover { background: rgba(255,255,255,0.3) !important; }
        .rem-row:last-child { border-bottom: none !important; }
      `}</style>
      <div
        className="rem-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '500px',
          borderRadius: '20px', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* ── HEADER ── */}
        <div style={{ background: gradient, padding: '28px 28px 22px', color: '#fff', position: 'relative' }}>
          {/* Decoración círculo */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: 20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 6px', fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                Reserva de sala
              </p>
              <h2 style={{ margin: '0 0 14px', fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.2, wordBreak: 'break-word' }}>
                {event.sala_nombre || 'Sala'}
              </h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  background: estadoBg[estadoKey] || 'rgba(255,255,255,0.15)',
                  color: estadoColor[estadoKey] || '#fff',
                  border: `1px solid ${estadoColor[estadoKey] || 'rgba(255,255,255,0.3)'}`,
                  borderRadius: '20px', padding: '3px 12px',
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
                }}>
                  {estadoKey}
                </span>
                {isOwn && (
                  <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '20px', padding: '3px 12px', fontSize: '0.72rem', fontWeight: 600 }}>
                    Tu reserva
                  </span>
                )}
              </div>
            </div>
            <button
              className="rem-close"
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
            >✕</button>
          </div>

          {/* Barra de tiempo */}
          <div style={{ position: 'relative', marginTop: '20px', background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ textAlign: 'center', minWidth: '52px' }}>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{fmtTime(event.start)}</p>
              <p style={{ margin: 0, fontSize: '0.65rem', opacity: 0.7 }}>INICIO</p>
            </div>
            <div style={{ flex: 1, position: 'relative', height: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '4px' }}>
              <div style={{ position: 'absolute', inset: 0, background: '#fff', borderRadius: '4px', opacity: 0.8 }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: gradient, color:'#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.3)' }}>
                {duracion}
              </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '52px' }}>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{fmtTime(event.end)}</p>
              <p style={{ margin: 0, fontSize: '0.65rem', opacity: 0.7 }}>FIN</p>
            </div>
          </div>
        </div>

        {/* ── CUERPO ── */}
        <div style={{ background: '#fff', padding: '20px 28px 24px' }}>
          {!isOcupado && (
            <InfoRow label="Socio" value={event.nombre_completo} icon="👤" />
          )}
          <InfoRow label="Fecha de inicio" value={fmt(event.start)} icon="📅" />
          <InfoRow label="Fecha de fin"    value={fmt(event.end)}   icon="🏁" />
          {event.observaciones && (
            <InfoRow label="Observaciones" value={event.observaciones} icon="📝" last />
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, last }) {
  return (
    <div className="rem-row" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '12px 0', borderBottom: last ? 'none' : '1px solid #f1f5f9' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ margin: 0, fontSize: '0.93rem', fontWeight: 600, color: '#1e293b', wordBreak: 'break-word' }}>{value}</p>
      </div>
    </div>
  );
}

function CalendarioView({ events, currentUser, setActiveView, setForm }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const formattedEvents = events.map(e => ({
    ...e,
    start: new Date(e.start),
    end: new Date(e.end),
    title: e.title || 'Reservada'
  }));

  const eventPropGetter = (event) => {
    let className = 'calendar-event-default';
    if (event.nombre_completo === 'Ocupado' || event.title.includes('- Reservada')) {
      className = 'calendar-event-busy';
    } else if (event.socio_id === currentUser?.id) {
      className = 'calendar-event-mine';
    } else {
      className = 'calendar-event-admin';
    }
    return { className };
  };

  const toLocalISOString = (date) => {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleSelectSlot = ({ start, end }) => {
    if (setForm) {
      setForm(prev => ({ ...prev, fecha_inicio: toLocalISOString(start), fecha_fin: toLocalISOString(end) }));
    }
  };

  return (
    <div className="panel full" style={{ height: '85vh', display: 'flex', flexDirection: 'column', border: 'none', boxShadow: 'none', padding: '0' }}>
      {selectedEvent && (
        <ReservaEventModal event={selectedEvent} currentUser={currentUser} onClose={() => setSelectedEvent(null)} />
      )}
      <div className="panel-title" style={{ marginBottom: '15px' }}>
        <CalendarDays size={22} style={{ color: 'var(--primary)' }} />
        <h2 style={{ fontSize: '20px' }}>Calendario de Reservas</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: 'auto' }}>Haz clic en una reserva para ver sus detalles</span>
      </div>
      <div style={{ flex: 1, padding: '1rem', background: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid var(--line)' }}>
        <Calendar
          localizer={localizer}
          events={formattedEvents}
          startAccessor="start"
          endAccessor="end"
          culture="es"
          selectable={true}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={(event) => setSelectedEvent(event)}
          views={['month', 'week', 'day']}
          defaultView="week"
          min={new Date(0, 0, 0, 8, 0, 0)}
          max={new Date(0, 0, 0, 22, 0, 0)}
          eventPropGetter={eventPropGetter}
          messages={{ next: 'Siguiente', previous: 'Anterior', today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch { return true; }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const token = localStorage.getItem('token');
    if (isTokenExpired(token)) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('isAdmin');
      return null;
    }
    return JSON.parse(localStorage.getItem('currentUser')) || null;
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    const token = localStorage.getItem('token');
    return !isTokenExpired(token) && localStorage.getItem('isAdmin') === 'true';
  });
  const [activeView, setActiveView] = useState(() => localStorage.getItem('activeView') || 'dashboard');
  const setActiveViewPersist = (view) => { setActiveView(view); localStorage.setItem('activeView', view); };
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [login, setLogin] = useState({ email: '', password: '' });
  const [showRecover, setShowRecover] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');

  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [salas, setSalas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [prestamos, setPrestamos] = useState([]);

  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reservaForm, setReservaForm] = useState(emptyReserva);
  const [prestamoForm, setPrestamoForm] = useState(emptyPrestamo);
  const [socioForm, setSocioForm] = useState(emptySocio);
  const [instrumentoForm, setInstrumentoForm] = useState(emptyInstrumento);
  const [salaForm, setSalaForm] = useState(emptySala);

  const visibleNav = useMemo(() => navItems.filter((item) => !item.adminOnly || isAdmin), [isAdmin]);
  const availableInstruments = useMemo(
    () => inventario.filter((item) => item.disponible && item.estado === 'DISPONIBLE'),
    [inventario]
  );

  async function api(path, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_URL}${path}`, {
      headers,
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      if (currentUser) {
        logout();
        throw new Error(data.error || 'Sesión expirada. Inicia sesión de nuevo.');
      }
    }
    if (!response.ok) throw new Error(data.error || 'Error de servidor');
    return data;
  }

  async function loadData(user = currentUser, admin = isAdmin) {
    if (!user) return;
    setLoading(true);
    try {
      const baseRequests = [
        api('/dashboard/stats').then(setStats),
        api('/inventario').then(setInventario),
        api('/salas').then(setSalas),
        api('/reservas/calendario').then(setCalendarEvents),
        api('/prestamos').then(setPrestamos),
      ];
      if (admin) {
        baseRequests.push(api('/users').then(setUsersList));
        baseRequests.push(api('/reservas').then(setReservas));
      } else {
        baseRequests.push(api(`/reservas/${user.id}`).then(setReservas));
      }
      await Promise.all(baseRequests);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function refreshCalendarAndReservas() {
    await Promise.all([
      api('/reservas/calendario').then(setCalendarEvents),
      isAdmin ? api('/reservas').then(setReservas) : api(`/reservas/${currentUser.id}`).then(setReservas),
      api('/dashboard/stats').then(setStats),
    ]);
  }

  async function refreshPrestamosAndInventario() {
    await Promise.all([
      api('/prestamos').then(setPrestamos),
      api('/inventario').then(setInventario),
      api('/dashboard/stats').then(setStats),
    ]);
  }

  async function refreshInventario() {
    await Promise.all([
      api('/inventario').then(setInventario),
      api('/dashboard/stats').then(setStats),
    ]);
  }

  async function refreshUsers() {
    await Promise.all([
      api('/users').then(setUsersList),
      api('/dashboard/stats').then(setStats),
    ]);
  }

  async function refreshSalas() {
    const data = await api('/salas');
    setSalas(data);
  }

  useEffect(() => {
    if (currentUser) loadData(currentUser, isAdmin);
  }, [currentUser, isAdmin]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify(login),
      });
      setCurrentUser(data.user);
      setIsAdmin(Boolean(data.is_admin));
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('isAdmin', Boolean(data.is_admin));
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      setReservaForm({ ...emptyReserva, user_id: data.user.id });
      setPrestamoForm({ ...emptyPrestamo, user_id: data.user.id });
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRecover(event) {
    event.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const data = await api('/auth/recover', { method: 'POST', body: JSON.stringify({ email: recoverEmail }) });
      setMessage({ text: data.message || 'Revisa tu WhatsApp', type: 'success' });
      setShowRecover(false);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    const token = localStorage.getItem('token');
    if (token) {
      // Revocar token en el servidor (best-effort, no bloquea)
      fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }).catch(() => {});
    }
    setCurrentUser(null);
    setIsAdmin(false);
    setActiveView('dashboard');
    setMessage({ text: '', type: '' });
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('token');
    localStorage.removeItem('activeView');
  }

  async function submitReserva(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const inicio = new Date(reservaForm.fecha_inicio);
      const fin = new Date(reservaForm.fecha_fin);
      const ahora = new Date();

      if (!isValidOperatingDate(reservaForm.fecha_inicio)) {
        throw new Error(OPERATING_DATE_ERROR);
      }
      if (inicio < ahora) {
        throw new Error('La fecha de inicio no puede estar en el pasado');
      }
      if (fin <= inicio) {
        throw new Error('La fecha de fin debe ser posterior al inicio');
      }
      if (inicio.toDateString() !== fin.toDateString()) {
        throw new Error('La reserva debe iniciar y terminar el mismo día');
      }
      if (inicio.getHours() < 8 || fin.getHours() > 22 || (fin.getHours() === 22 && fin.getMinutes() > 0)) {
        throw new Error('Las reservas solo están permitidas entre las 08:00 y las 22:00');
      }
      const duracionHoras = (fin - inicio) / (1000 * 60 * 60);
      if (duracionHoras < 1) {
        throw new Error('La reserva debe durar al menos 1 hora');
      }
      if (duracionHoras > 4) {
        throw new Error('La reserva no puede durar más de 4 horas');
      }

      await api('/reservas', {
        method: 'POST',
        body: JSON.stringify({ ...reservaForm, user_id: isAdmin ? reservaForm.user_id : currentUser.id }),
      });
      setMessage({ text: 'Reserva registrada correctamente.', type: 'success' });
      setReservaForm({ ...emptyReserva, user_id: isAdmin ? '' : currentUser.id });
      await refreshCalendarAndReservas();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancelReserva(id) {
    try {
      await api(`/reservas/${id}`, { method: 'DELETE' });
      setMessage({ text: 'Reserva cancelada.', type: 'success' });
      await refreshCalendarAndReservas();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  async function submitPrestamo(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!isValidOperatingDate(prestamoForm.fecha_salida)) {
        throw new Error(OPERATING_DATE_ERROR);
      }
      if (!isValidOperatingDate(prestamoForm.fecha_limite)) {
        throw new Error('La fecha límite de devolución no puede ser domingo ni sábado a partir de las 12:00.');
      }
      await api('/prestamos/solicitar', {
        method: 'POST',
        body: JSON.stringify({ ...prestamoForm, user_id: isAdmin ? prestamoForm.user_id : currentUser.id }),
      });
      setMessage({ text: 'Préstamo registrado correctamente.', type: 'success' });
      setPrestamoForm({ ...emptyPrestamo, user_id: isAdmin ? '' : currentUser.id });
      await refreshPrestamosAndInventario();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function devolverPrestamo(id) {
    if (!window.confirm('¿Confirmas la devolución de este instrumento? Esta acción no se puede deshacer.')) return;
    try {
      await api(`/prestamos/${id}/devolver`, { method: 'POST', body: JSON.stringify({ estado_instrumento: 'DISPONIBLE' }) });
      setMessage({ text: 'Instrumento devuelto correctamente.', type: 'success' });
      await refreshPrestamosAndInventario();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  async function submitSocio(event) {
    event.preventDefault();
    try {
      await api('/users', { method: 'POST', body: JSON.stringify(socioForm) });
      setSocioForm(emptySocio);
      setMessage({ text: 'Socio creado correctamente.', type: 'success' });
      await refreshUsers();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  async function submitInstrumento(event) {
    event.preventDefault();
    try {
      await api('/inventario', { method: 'POST', body: JSON.stringify(instrumentoForm) });
      setInstrumentoForm(emptyInstrumento);
      setMessage({ text: 'Instrumento creado correctamente.', type: 'success' });
      await refreshInventario();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  async function submitSala(event) {
    event.preventDefault();
    try {
      await api('/salas', { method: 'POST', body: JSON.stringify(salaForm) });
      setSalaForm(emptySala);
      setMessage({ text: 'Sala creada correctamente.', type: 'success' });
      await refreshSalas();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  async function handleEditSave(userId, updatedData) {
    try {
      await api(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(updatedData) });
      setEditingUser(null);
      setMessage({ text: 'Socio actualizado correctamente.', type: 'success' });
      await api('/users').then(setUsersList);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  if (!currentUser) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div className="brand-mark"><Guitar size={34} /></div>
          <h1>Club de Música</h1>
          <p>Gestión de socios, salas, préstamos e inventario.</p>
          <Message message={message} />
          {!showRecover ? (
            <>
              <form className="form" onSubmit={handleLogin}>
                <Field label="Correo institucional">
                  <TextInput type="email" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} required />
                </Field>
                <Field label="Contraseña">
                  <TextInput type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} required />
                </Field>
                <button className="button primary" type="submit" disabled={loading}>
                  {loading ? 'Validando...' : 'Ingresar'}
                </button>
              </form>
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button className="link-button" onClick={() => setShowRecover(true)}>¿Olvidaste tu contraseña?</button>
              </div>
            </>
          ) : (
            <>
              <form className="form" onSubmit={handleRecover}>
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#666' }}>Ingresa tu correo institucional y te enviaremos un código PIN temporal a tu WhatsApp registrado.</p>
                <Field label="Correo institucional">
                  <TextInput type="email" value={recoverEmail} onChange={(e) => setRecoverEmail(e.target.value)} required />
                </Field>
                <button className="button primary" type="submit" disabled={loading}>
                  {loading ? 'Enviando...' : 'Recuperar contraseña'}
                </button>
              </form>
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button className="link-button" onClick={() => setShowRecover(false)}>Volver al inicio</button>
              </div>
            </>
          )}
          <div className="hint" style={{ marginTop: '1.5rem' }}>
            Ingresa con tu correo institucional @pucesa.edu.ec
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark compact"><Guitar size={22} /></div>
          <div>
            <strong>Club Música</strong>
            <span>{isAdmin ? 'Administrador' : 'Socio'}</span>
          </div>
        </div>
        <nav>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`nav-button ${activeView === item.id ? 'active' : ''}`} onClick={() => setActiveViewPersist(item.id)}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{visibleNav.find((item) => item.id === activeView)?.label}</h1>
            <p>{currentUser.nombre_completo} · {currentUser.email_institucional}</p>
          </div>
          <div className="topbar-actions">
            <button className="button ghost" onClick={logout}>
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </header>

        <Message message={message} />

        {activeView === 'dashboard' && (
          <Dashboard isAdmin={isAdmin} stats={stats} reservas={reservas} prestamos={prestamos} inventario={inventario} currentUser={currentUser} salas={salas} usersList={usersList} />
        )}
        {activeView === 'calendario' && (
          <CalendarioView events={calendarEvents} currentUser={currentUser} setActiveView={setActiveViewPersist} setForm={setReservaForm} />
        )}
        {activeView === 'reservas' && (
          <ReservasView
            api={api}
            isAdmin={isAdmin}
            usersList={usersList}
            salas={salas}
            reservas={reservas}
            calendarEvents={calendarEvents}
            currentUser={currentUser}
            form={reservaForm}
            setForm={setReservaForm}
            onSubmit={submitReserva}
            onCancel={cancelReserva}
            isSubmitting={isSubmitting}
          />
        )}
        {activeView === 'prestamos' && (
          <PrestamosView
            api={api}
            isAdmin={isAdmin}
            usersList={usersList}
            instrumentos={availableInstruments}
            prestamos={prestamos}
            currentUser={currentUser}
            form={prestamoForm}
            setForm={setPrestamoForm}
            onSubmit={submitPrestamo}
            onReturn={devolverPrestamo}
            isSubmitting={isSubmitting}
          />
        )}
        {activeView === 'inventario' && (
          <InventarioView
            isAdmin={isAdmin}
            inventario={inventario}
            setInventario={setInventario}
            form={instrumentoForm}
            setForm={setInstrumentoForm}
            onSubmit={submitInstrumento}
            api={api}
          />
        )}
        {activeView === 'socios' && (
          <SociosView api={api} form={socioForm} setForm={setSocioForm} onSubmit={submitSocio} setEditingUser={setEditingUser} />
        )}
        {activeView === 'salas' && (
          <SalasView salas={salas} setSalas={setSalas} form={salaForm} setForm={setSalaForm} onSubmit={submitSala} api={api} isAdmin={isAdmin} />
        )}
        {activeView === 'estadisticas' && (
          <StatisticsView api={api} isAdmin={isAdmin} />
        )}
        {activeView === 'perfil' && (
          <PerfilView api={api} currentUser={currentUser} loadData={loadData} setCurrentUser={setCurrentUser} />
        )}
      {editingUser && <EditSocioModal socio={editingUser} onClose={() => setEditingUser(null)} onSave={handleEditSave} />}
</section>
    </div>
  );
}

function PerfilView({ api, currentUser, loadData, setCurrentUser }) {
  const [perfilForm, setPerfilForm] = useState({ 
    telefono_whatsapp: currentUser.telefono_whatsapp || '', 
    nivel_habilidad: currentUser.nivel_habilidad || 'PRINCIPIANTE' 
  });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  
  async function submitPerfil(e) {
    e.preventDefault();
    try {
      await api('/users/me', { method: 'PUT', body: JSON.stringify(perfilForm) });
      setMessage({ text: 'Perfil actualizado', type: 'success' });
      setCurrentUser({ ...currentUser, ...perfilForm });
      localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...perfilForm }));
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  async function submitPassword(e) {
    e.preventDefault();
    try {
      await api('/users/me/password', { method: 'PUT', body: JSON.stringify(passwordForm) });
      setMessage({ text: 'Contraseña actualizada. Usa esta contraseña la próxima vez.', type: 'success' });
      setPasswordForm({ current_password: '', new_password: '' });
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  return (
    <div className="two-column">
      <section className="panel">
        <div className="panel-title"><Users size={18} /><h2>Actualizar Perfil</h2></div>
        <Message message={message} />
        <form className="form" onSubmit={submitPerfil}>
          <Field label="Correo (No modificable)"><TextInput type="email" value={currentUser.email_institucional} disabled /></Field>
          <Field label="Nombre (No modificable)"><TextInput value={currentUser.nombre_completo} disabled /></Field>
          <Field label="WhatsApp">
            <TextInput value={perfilForm.telefono_whatsapp} onChange={(e) => setPerfilForm({ ...perfilForm, telefono_whatsapp: e.target.value })} placeholder="0991234567" maxLength={10} required />
            {perfilForm.telefono_whatsapp && !/^\d{10}$/.test(perfilForm.telefono_whatsapp) && (
              <div style={OPERATING_DATE_WARNING_STYLE}>⛔ Debe tener exactamente 10 dígitos (ej: 0991234567)</div>
            )}
          </Field>
          <Field label="Nivel">
            <SelectInput value={perfilForm.nivel_habilidad} onChange={(e) => setPerfilForm({ ...perfilForm, nivel_habilidad: e.target.value })}>
              <option value="PRINCIPIANTE">PRINCIPIANTE</option>
              <option value="INTERMEDIO">INTERMEDIO</option>
              <option value="AVANZADO">AVANZADO</option>
              <option value="PROFESIONAL">PROFESIONAL</option>
            </SelectInput>
          </Field>
          <button className="button primary" type="submit">Guardar Datos</button>
        </form>
      </section>

      <section className="panel wide">
        <div className="panel-title"><Users size={18} /><h2>Cambiar Contraseña</h2></div>
        <form className="form" onSubmit={submitPassword}>
          <Field label="Contraseña Actual"><TextInput type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} required /></Field>
          <Field label="Nueva Contraseña"><TextInput type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} required /></Field>
          <button className="button primary" type="submit">Cambiar Contraseña</button>
        </form>
      </section>
    </div>
  );
}

function DashboardCardModal({ type, stats, reservas, prestamos, inventario, salas, usersList, isAdmin, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const cfgs = {
    socios:    { title: 'Socios del Club',             emoji: '👥', gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' },
    inventario:{ title: 'Inventario de Instrumentos',  emoji: '🎸', gradient: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)' },
    salas:     { title: 'Salas de Ensayo',             emoji: '🏛️', gradient: 'linear-gradient(135deg, #5b21b6 0%, #8b5cf6 100%)' },
    reservas:  { title: 'Reservas Confirmadas',        emoji: '📅', gradient: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)' },
    prestamos: { title: 'Préstamos Activos',           emoji: '🎵', gradient: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)' },
  };
  const cfg = cfgs[type] || cfgs.socios;

  const renderBody = () => {
    if (type === 'socios') {
      const activos   = usersList.filter(u => u.estado === 'ACTIVO');
      const bloqueados = usersList.filter(u => u.estado === 'BLOQUEADO');
      const admins    = usersList.filter(u => u.rol === 'ADMIN');
      return (
        <>
          <div className="dash-stat-row">
            <div className="dash-stat-chip"><strong style={{ color: '#16803d' }}>{activos.length}</strong><span>Activos</span></div>
            <div className="dash-stat-chip"><strong style={{ color: '#986800' }}>{bloqueados.length}</strong><span>Bloqueados</span></div>
            <div className="dash-stat-chip"><strong style={{ color: '#1d4ed8' }}>{admins.length}</strong><span>Admins</span></div>
            <div className="dash-stat-chip"><strong>{usersList.length}</strong><span>Total</span></div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '10px', fontWeight: 600 }}>SOCIOS ACTIVOS</p>
          {activos.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>No hay socios activos.</p>}
          {activos.map(u => (
            <div className="dash-list-item" key={u.id}>
              <div>
                <div style={{ fontWeight: 600 }}>{u.nombre_completo}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{u.email_institucional}</div>
              </div>
              <span className={`badge badge-${(u.rol || '').toLowerCase()}`}>{u.rol}</span>
            </div>
          ))}
        </>
      );
    }

    if (type === 'inventario') {
      const disp = inventario.filter(i => i.estado === 'DISPONIBLE');
      const prest = inventario.filter(i => i.estado === 'PRESTADO');
      const mant = inventario.filter(i => i.estado === 'MANTENIMIENTO');
      const baja = inventario.filter(i => i.estado === 'BAJA');
      const tipos = [...new Set(inventario.map(i => i.tipo).filter(Boolean))];
      return (
        <>
          <div className="dash-stat-row">
            <div className="dash-stat-chip"><strong style={{ color: '#16803d' }}>{disp.length}</strong><span>Disponibles</span></div>
            <div className="dash-stat-chip"><strong style={{ color: '#ef4444' }}>{prest.length}</strong><span>Prestados</span></div>
            <div className="dash-stat-chip"><strong style={{ color: '#986800' }}>{mant.length}</strong><span>Mantenimiento</span></div>
            <div className="dash-stat-chip"><strong style={{ color: '#6b7280' }}>{baja.length}</strong><span>De Baja</span></div>
          </div>
          {tipos.length > 0 && (
            <>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '10px', fontWeight: 600 }}>POR TIPO</p>
              {tipos.map(tipo => {
                const cnt = inventario.filter(i => i.tipo === tipo).length;
                return (
                  <div className="dash-list-item" key={tipo}>
                    <span style={{ fontWeight: 600 }}>{tipo}</span>
                    <span className="badge">{cnt} instrumento{cnt !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </>
          )}
        </>
      );
    }

    if (type === 'salas') {
      const activas = salas.filter(s => s.estado === 'ACTIVA');
      const inactivas = salas.filter(s => s.estado !== 'ACTIVA');
      return (
        <>
          <div className="dash-stat-row">
            <div className="dash-stat-chip"><strong style={{ color: '#16803d' }}>{activas.length}</strong><span>Activas</span></div>
            <div className="dash-stat-chip"><strong style={{ color: '#986800' }}>{inactivas.length}</strong><span>Inactivas / Mant.</span></div>
            <div className="dash-stat-chip"><strong>{salas.reduce((s, r) => s + (r.capacidad || 0), 0)}</strong><span>Cap. Total</span></div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '10px', fontWeight: 600 }}>DETALLE DE SALAS</p>
          {salas.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>No hay salas registradas.</p>}
          {salas.map(s => (
            <div className="dash-list-item" key={s.id}>
              <div>
                <div style={{ fontWeight: 600 }}>{s.nombre}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Capacidad: {s.capacidad} personas</div>
              </div>
              <span className={`badge badge-${(s.estado || '').toLowerCase()}`}>{s.estado}</span>
            </div>
          ))}
        </>
      );
    }

    if (type === 'reservas') {
      const confirmadas = reservas.filter(r => r.estado === 'CONFIRMADA');
      const proximas = confirmadas.filter(r => new Date(r.fecha_inicio) > new Date())
        .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
        .slice(0, 15);
      const salaCount = {};
      confirmadas.forEach(r => { salaCount[r.sala_nombre] = (salaCount[r.sala_nombre] || 0) + 1; });
      const topSalas = Object.entries(salaCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
      return (
        <>
          <div className="dash-stat-row">
            <div className="dash-stat-chip"><strong style={{ color: '#16803d' }}>{confirmadas.length}</strong><span>Confirmadas</span></div>
            <div className="dash-stat-chip"><strong style={{ color: '#1d4ed8' }}>{proximas.length}</strong><span>Próximas</span></div>
            <div className="dash-stat-chip"><strong>{reservas.filter(r => r.estado === 'CANCELADA').length}</strong><span>Canceladas</span></div>
          </div>
          {topSalas.length > 0 && (
            <>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600 }}>SALAS MÁS RESERVADAS</p>
              <div className="dash-stat-row" style={{ marginBottom: '16px' }}>
                {topSalas.map(([sala, cnt]) => (
                  <div className="dash-stat-chip" key={sala}><strong>{cnt}</strong><span style={{ fontSize: '10px' }}>{sala}</span></div>
                ))}
              </div>
            </>
          )}
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '10px', fontWeight: 600 }}>PRÓXIMAS RESERVAS</p>
          {proximas.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>No hay reservas próximas.</p>}
          {proximas.map(r => (
            <div className="dash-list-item" key={r.id}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.sala_nombre}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{isAdmin ? (r.nombre_completo || '—') : ''} {formatDate(r.fecha_inicio)}</div>
              </div>
              <span className="badge badge-confirmada">CONFIRMADA</span>
            </div>
          ))}
        </>
      );
    }

    if (type === 'prestamos') {
      const activos = prestamos.filter(p => p.estado === 'ACTIVO');
      const vencidosEstado = prestamos.filter(p => p.estado === 'VENCIDO');
      const enTiempo = activos.filter(p => new Date(p.fecha_limite) >= new Date());
      const pendienteDevolucion = [...activos.filter(p => new Date(p.fecha_limite) < new Date()), ...vencidosEstado];
      const todos = [...activos, ...vencidosEstado].sort((a, b) => new Date(a.fecha_limite) - new Date(b.fecha_limite));
      return (
        <>
          <div className="dash-stat-row">
            <div className="dash-stat-chip"><strong style={{ color: '#16803d' }}>{enTiempo.length}</strong><span>En tiempo</span></div>
            <div className="dash-stat-chip"><strong style={{ color: '#ef4444' }}>{pendienteDevolucion.length}</strong><span>Vencidos</span></div>
            <div className="dash-stat-chip"><strong>{todos.length}</strong><span>Total abiertos</span></div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '10px', fontWeight: 600 }}>INSTRUMENTOS SIN DEVOLVER</p>
          {todos.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>No hay préstamos abiertos.</p>}
          {todos.map(p => {
            const esVencido = p.estado === 'VENCIDO' || new Date(p.fecha_limite) < new Date();
            return (
              <div className="dash-list-item" key={p.id} style={{ borderLeft: `3px solid ${esVencido ? '#ef4444' : '#10b981'}` }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.instrumento_nombre}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    {isAdmin && p.nombre_completo ? `${p.nombre_completo} · ` : ''}
                    Límite: {formatDate(p.fecha_limite)}
                  </div>
                </div>
                <span className={`badge ${esVencido ? 'badge-cancelada' : 'badge-activo'}`}>{esVencido ? 'VENCIDO' : 'EN TIEMPO'}</span>
              </div>
            );
          })}
        </>
      );
    }

    return null;
  };

  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div className="dash-modal" onClick={e => e.stopPropagation()}>
        <div className="dash-modal-header" style={{ background: cfg.gradient }}>
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '4px' }}>{cfg.emoji}</div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{cfg.title}</h2>
            <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '0.82rem', color: 'white' }}>
              Resumen en tiempo real · {new Date().toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 34, height: 34, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
        </div>
        <div className="dash-modal-body">
          {renderBody()}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ isAdmin, stats, reservas, prestamos, inventario, currentUser, salas, usersList }) {
  const [fSocio, setFSocio] = useState('');
  const [fSala, setFSala] = useState('');
  const [fFechaInicio, setFFechaInicio] = useState('');
  const [fFechaFin, setFFechaFin] = useState('');
  const [fInstrumento, setFInstrumento] = useState('');
  const [openCard, setOpenCard] = useState(null);

  const myLoans = currentUser
    ? prestamos.filter((p) => p.user_id === currentUser.id && p.estado === 'ACTIVO')
    : [];

  const cards = isAdmin ? [
    ['Socios activos', stats?.socios_activos ?? 0, 'socios'],
    ['Instrumentos', stats?.instrumentos ?? inventario.filter(i => i.estado !== 'BAJA').length, 'inventario'],
    ['Salas disponibles', stats?.salas_disponibles ?? salas.filter(s => s.estado === 'ACTIVA').length, 'salas'],
    ['Reservas confirmadas', stats?.reservas_confirmadas ?? reservas.filter(r => r.estado === 'CONFIRMADA').length, 'reservas'],
    ['Préstamos activos', stats?.prestamos_activos ?? prestamos.filter((p) => p.estado === 'ACTIVO').length, 'prestamos'],
  ] : [
    ['Tus reservas confirmadas', reservas.filter(r => r.estado === 'CONFIRMADA').length, 'reservas'],
    ['Tus préstamos activos', myLoans.length, 'prestamos'],
  ];

  // Fuente de reservas: siempre usar el array completo para poder filtrar
  const allUpcoming = reservas.filter(r =>
    new Date(r.fecha_inicio) > new Date() && r.estado === 'CONFIRMADA'
  );

  const filteredReservas = allUpcoming.filter(r => {
    if (fSocio && !(r.nombre_completo || '').toLowerCase().includes(fSocio.toLowerCase())) return false;
    if (fSala && r.sala_nombre !== fSala) return false;
    if (fFechaInicio && new Date(r.fecha_inicio) < new Date(fFechaInicio)) return false;
    if (fFechaFin && new Date(r.fecha_inicio) > new Date(fFechaFin + 'T23:59:59')) return false;
    return true;
  });

  const activePrestamos = prestamos.filter(p => p.estado === 'ACTIVO');
  const filteredPrestamos = activePrestamos.filter(p => {
    if (fSocio && !(p.nombre_completo || '').toLowerCase().includes(fSocio.toLowerCase())) return false;
    if (fInstrumento && !(p.instrumento_nombre || '').toLowerCase().includes(fInstrumento.toLowerCase())) return false;
    if (fFechaInicio && new Date(p.fecha_salida) < new Date(fFechaInicio)) return false;
    if (fFechaFin && new Date(p.fecha_salida) > new Date(fFechaFin + 'T23:59:59')) return false;
    return true;
  });

  const hasFilters = fSocio || fSala || fFechaInicio || fFechaFin || fInstrumento;

  const inputStyle = { padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.83rem', background: 'var(--surface)', color: 'var(--text)', minWidth: 0 };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '2px', display: 'block' };

  return (
    <div className="stack">
      {openCard && (
        <DashboardCardModal
          type={openCard}
          stats={stats}
          reservas={reservas}
          prestamos={prestamos}
          inventario={inventario}
          salas={salas}
          usersList={usersList || []}
          isAdmin={isAdmin}
          onClose={() => setOpenCard(null)}
        />
      )}
      <div className="metrics-grid">
        {cards.map(([label, value, cardType]) => (
          <article className="metric-card" key={label} onClick={() => setOpenCard(cardType)} title="Haz clic para ver el resumen">
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      {/* Panel de filtros */}
      <section className="panel" style={{ paddingBottom: '16px' }}>
        <div className="panel-title" style={{ marginBottom: '12px' }}>
          <Activity size={18} />
          <h2>Filtros de actividad</h2>
          {hasFilters && (
            <button className="button ghost" style={{ marginLeft: 'auto', fontSize: '0.78rem', padding: '3px 10px' }}
              onClick={() => { setFSocio(''); setFSala(''); setFFechaInicio(''); setFFechaFin(''); setFInstrumento(''); }}>
              Limpiar filtros
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          {isAdmin && (
            <div>
              <label style={labelStyle}>Socio</label>
              <input style={inputStyle} placeholder="Buscar socio..." value={fSocio} onChange={e => setFSocio(e.target.value)} />
            </div>
          )}
          <div>
            <label style={labelStyle}>Sala</label>
            <select style={inputStyle} value={fSala} onChange={e => setFSala(e.target.value)}>
              <option value="">Todas las salas</option>
              {(salas || []).map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Instrumento</label>
            <input style={inputStyle} placeholder="Buscar instrumento..." value={fInstrumento} onChange={e => setFInstrumento(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Fecha desde</label>
            <input style={inputStyle} type="date" value={fFechaInicio} onChange={e => setFFechaInicio(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Fecha hasta</label>
            <input style={inputStyle} type="date" value={fFechaFin} onChange={e => setFFechaFin(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Préstamos activos (socio: solo los suyos; admin: todos filtrados) */}
      {!isAdmin && myLoans.length > 0 && (
        <section className="panel">
          <div className="panel-title"><PackageCheck size={18} /><h2>Tus préstamos activos</h2></div>
          <div className="table">
            {myLoans.map((prestamo) => (
              <div className="row" key={prestamo.id}>
                <span style={{ fontWeight: '600' }}>{prestamo.instrumento_nombre}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Límite: {formatDate(prestamo.fecha_limite)}</span>
                <CountdownTimer fechaLimite={prestamo.fecha_limite} />
                <Badge value={prestamo.estado} />
              </div>
            ))}
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="panel">
          <div className="panel-title"><PackageCheck size={18} /><h2>Préstamos activos</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: 'auto' }}>{filteredPrestamos.length} resultado{filteredPrestamos.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="table">
            {filteredPrestamos.length === 0
              ? <p style={{ padding: '0.8rem', color: 'var(--muted)', fontSize: '0.88rem' }}>No hay préstamos activos con esos filtros.</p>
              : filteredPrestamos.map(p => (
                <div className="row" key={p.id}>
                  <span style={{ fontWeight: 600 }}>{p.instrumento_nombre}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{p.nombre_completo}</span>
                  <span style={{ fontSize: '0.85rem' }}>Límite: {formatDate(p.fecha_limite)}</span>
                  <CountdownTimer fechaLimite={p.fecha_limite} />
                  <Badge value={p.estado} />
                </div>
              ))
            }
          </div>
        </section>
      )}

      {/* Próximas reservas filtradas */}
      <section className="panel">
        <div className="panel-title">
          <Activity size={18} />
          <h2>Próximas reservas</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: 'auto' }}>{filteredReservas.length} resultado{filteredReservas.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="table">
          {filteredReservas.length === 0
            ? <p style={{ padding: '0.8rem', color: 'var(--muted)', fontSize: '0.88rem' }}>No hay reservas próximas con esos filtros.</p>
            : filteredReservas.map(reserva => (
              <div className="row" key={reserva.id}>
                <span>{reserva.sala_nombre}</span>
                <span>{reserva.nombre_completo || 'Mi reserva'}</span>
                <span>{formatDate(reserva.fecha_inicio)}</span>
                <Badge value={reserva.estado || 'CONFIRMADA'} />
              </div>
            ))
          }
        </div>
      </section>
    </div>
  );
}

function ReservasView({ api, isAdmin, usersList, salas, reservas, calendarEvents, currentUser, form, setForm, onSubmit, onCancel, isSubmitting }) {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const opHours = isWithinOperatingHours();

  const parsedCalendarEvents = useMemo(
    () => (calendarEvents || []).map(e => ({ ...e, startDate: new Date(e.start), endDate: new Date(e.end) })),
    [calendarEvents]
  );

  const formErrors = useMemo(() => {
    const errors = {};
    const now = new Date();
    const inicio = form.fecha_inicio ? new Date(form.fecha_inicio) : null;
    const fin = form.fecha_fin ? new Date(form.fecha_fin) : null;

    if (form.fecha_inicio && !isValidOperatingDate(form.fecha_inicio))
      errors.fecha_inicio = OPERATING_DATE_ERROR;
    else if (inicio && inicio < now)
      errors.fecha_inicio = 'La fecha de inicio no puede estar en el pasado.';

    if (inicio && fin) {
      if (fin <= inicio)
        errors.fecha_fin = 'La hora de fin debe ser posterior al inicio.';
      else if (inicio.toDateString() !== fin.toDateString())
        errors.fecha_fin = 'La reserva debe iniciar y terminar el mismo día.';
      else if ((fin - inicio) > 4 * 3600 * 1000)
        errors.fecha_fin = 'La reserva no puede durar más de 4 horas.';
    }

    if (form.sala_id && inicio && fin && !errors.fecha_inicio && !errors.fecha_fin) {
      const conflict = parsedCalendarEvents.some(e => {
        if (String(e.sala_id) !== String(form.sala_id)) return false;
        return inicio < e.endDate && fin > e.startDate;
      });
      if (conflict) errors.conflicto = 'La sala ya está reservada en ese horario.';
    }

    return errors;
  }, [form.fecha_inicio, form.fecha_fin, form.sala_id, parsedCalendarEvents]);
  const formHasErrors = Object.keys(formErrors).length > 0;

  // Filtra los eventos del calendario según la sala y (en admin) el socio seleccionado en el formulario
  const filteredCalendarEvents = useMemo(() => {
    let events = calendarEvents || [];
    // Filtra por sala para ver ocupación real — nunca ocultar por usuario
    if (form.sala_id) {
      events = events.filter(e => String(e.sala_id) === String(form.sala_id));
    }
    return events;
  }, [calendarEvents, form.sala_id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      api(`/reservas?page=${page}&limit=5&search=${search}`).then(res => {
        if(res.data) {
          setData(res.data);
          setTotal(res.total);
        } else {
          setData(res);
          setTotal(res.length);
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search, form]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <section className="panel" style={{ height: 'fit-content' }}>
            <div className="panel-title"><Plus size={18} /><h2>Nueva reserva</h2></div>
            {!opHours && <OperatingHoursAlert />}
            <form className="form" onSubmit={onSubmit}>
              <fieldset disabled={!opHours} style={{ border: 'none', padding: 0, margin: 0 }}>
              {isAdmin && (
                <Field label="Socio">
                  <SelectInput value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required>
                    <option value="">Selecciona un socio</option>
                    {usersList.map((user) => <option key={user.id} value={user.id}>{user.nombre_completo}</option>)}
                  </SelectInput>
                </Field>
              )}
              <Field label="Sala">
                <SelectInput value={form.sala_id} onChange={(e) => setForm({ ...form, sala_id: e.target.value })} required>
                  <option value="">Selecciona una sala</option>
                  {salas.filter((sala) => sala.estado === 'ACTIVA').map((sala) => (
                    <option key={sala.id} value={sala.id}>{sala.nombre} · {sala.capacidad} personas</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Inicio">
                <TextInput
                  type="datetime-local"
                  value={form.fecha_inicio}
                  onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                  min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  required
                />
                {formErrors.fecha_inicio && (
                  <div style={OPERATING_DATE_WARNING_STYLE}>⛔ {formErrors.fecha_inicio}</div>
                )}
              </Field>
              <Field label="Fin">
                <TextInput
                  type="datetime-local"
                  value={form.fecha_fin}
                  onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                  min={form.fecha_inicio || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  required
                />
                {formErrors.fecha_fin && (
                  <div style={OPERATING_DATE_WARNING_STYLE}>⛔ {formErrors.fecha_fin}</div>
                )}
              </Field>
              {formErrors.conflicto && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⛔ {formErrors.conflicto}
                </div>
              )}
              <label className="checkline">
                <input type="checkbox" checked={form.terminos_aceptados} onChange={(e) => setForm({ ...form, terminos_aceptados: e.target.checked })} />
                Acepto las condiciones de uso de sala.
              </label>
              <button className="button primary" type="submit" disabled={!opHours || formHasErrors || isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Confirmar reserva'}
              </button>
              </fieldset>
            </form>
          </section>

          <section className="panel" style={{ height: 'fit-content' }}>
            <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CalendarDays size={18} /><h2>Lista de reservas</h2></div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <TextInput placeholder="Buscar por socio o sala..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="table" style={{ fontSize: '0.85rem' }}>
              {data.map((reserva) => (
                <div className="row" key={reserva.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong>{reserva.sala_nombre}</strong>
                    <span style={{ color: 'var(--muted)' }}>{formatDate(reserva.fecha_inicio)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <Badge value={reserva.estado} />
                    {reserva.estado !== 'CANCELADA' && <button className="link-button" onClick={() => { onCancel(reserva.id); setPage(page); }} style={{ fontSize: '0.8rem' }}>Cancelar</button>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
              <button className="button ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '4px' }}>Ant</button>
              <span>Pág {page} ({total})</span>
              <button className="button ghost" disabled={page * 5 >= total} onClick={() => setPage(p => p + 1)} style={{ padding: '4px' }}>Sig</button>
            </div>
          </section>
        </div>

        <section className="panel" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-title" style={{ marginBottom: '12px' }}>
            <CalendarDays size={18} style={{ color: 'var(--primary)' }} />
            <h2>Calendario de Reservas</h2>
            {form.sala_id ? (
              <span style={{ fontSize: '0.8rem', marginLeft: 'auto', fontWeight: 600, color: 'var(--primary)', background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: '6px', padding: '2px 10px' }}>
                {salas.find(s => String(s.id) === String(form.sala_id))?.nombre || 'Sala'}
                {isAdmin && form.user_id ? ` · ${usersList.find(u => String(u.id) === String(form.user_id))?.nombre_completo || ''}` : ''}
              </span>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: 'auto' }}>Haz clic y arrastra para pre-llenar el formulario</span>
            )}
          </div>
          <div style={{ flex: 1, minHeight: '550px' }}>
            <Calendar
              localizer={localizer}
              events={filteredCalendarEvents.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end), title: e.sala_nombre ? `${e.sala_nombre} - ${e.nombre_completo || ''}` : (e.title || 'Reservada') }))}
              startAccessor="start"
              endAccessor="end"
              culture="es"
              selectable={true}
              onSelectSlot={({ start, end }) => {
                const pad = (n) => n.toString().padStart(2, '0');
                const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                setForm(prev => ({ ...prev, fecha_inicio: fmt(start), fecha_fin: fmt(end) }));
              }}
              views={['month', 'week', 'day']}
              defaultView="week"
              min={new Date(0, 0, 0, 8, 0, 0)}
              max={new Date(0, 0, 0, 22, 0, 0)}
              eventPropGetter={(event) => {
                // Reserva del socio seleccionado en el form (admin) o del usuario actual → verde
                const highlightId = isAdmin && form.user_id ? Number(form.user_id) : currentUser?.id;
                if (event.socio_id === highlightId)
                  return { style: { backgroundColor: '#dcfce7', color: '#166534', borderLeft: '4px solid #16a34a', borderRadius: '6px' } };
                // Reserva de otro usuario → azul (indica que el horario está ocupado)
                return { style: { backgroundColor: '#e0f2fe', color: '#0369a1', borderLeft: '4px solid #0284c7', borderRadius: '6px' } };
              }}
              messages={{ next: 'Siguiente', previous: 'Anterior', today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', noEventsInRange: 'Sin reservas en este rango' }}
              style={{ height: '100%', minHeight: '550px' }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function PrestamosView({ api, isAdmin, usersList, instrumentos, prestamos, currentUser, form, setForm, onSubmit, onReturn, isSubmitting }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedPrestamo, setSelectedPrestamo] = useState(null);
  const opHours = isWithinOperatingHours();

  // Determina si el socio seleccionado (o el usuario actual) ya tiene un préstamo activo
  const targetUserId = isAdmin ? Number(form.user_id) : currentUser?.id;
  const hasActiveLoan = targetUserId
    ? (prestamos || []).some(p => p.user_id === targetUserId && p.estado === 'ACTIVO')
    : false;
  const activeLoan = hasActiveLoan
    ? (prestamos || []).find(p => p.user_id === targetUserId && p.estado === 'ACTIVO')
    : null;

  const prestamoErrors = (() => {
    const errors = {};
    const now = new Date();
    const salida = form.fecha_salida ? new Date(form.fecha_salida) : null;
    const limite = form.fecha_limite ? new Date(form.fecha_limite) : null;

    if (form.fecha_salida && !isValidOperatingDate(form.fecha_salida))
      errors.fecha_salida = OPERATING_DATE_ERROR;
    else if (salida && salida < now)
      errors.fecha_salida = 'La fecha de salida no puede estar en el pasado.';

    if (form.fecha_limite && !isValidOperatingDate(form.fecha_limite))
      errors.fecha_limite = 'La fecha límite no puede ser domingo ni sábado a partir de las 12:00.';
    else if (salida && limite && limite <= salida)
      errors.fecha_limite = 'La fecha límite debe ser posterior a la de salida.';

    return errors;
  })();
  const prestamoHasErrors = Object.keys(prestamoErrors).length > 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      api(`/prestamos?page=${page}&limit=5&search=${search}`).then(res => {
        if (res.data) { setData(res.data); setTotal(res.total); }
        else { setData(res); setTotal(res.length); }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search, form]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="two-column">
      {selectedPrestamo && (
        <PrestamoDetailModal prestamo={selectedPrestamo} onClose={() => setSelectedPrestamo(null)} />
      )}
      <section className="panel">
        <div className="panel-title"><PackageCheck size={18} /><h2>Registrar préstamo</h2></div>
        {!opHours && <OperatingHoursAlert />}
        {hasActiveLoan && (
          <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 700, color: '#92400e', margin: '0 0 2px', fontSize: '0.9rem' }}>Préstamo activo pendiente</p>
              <p style={{ color: '#b45309', margin: 0, fontSize: '0.82rem' }}>
                {isAdmin
                  ? `Este socio ya tiene prestado: "${activeLoan?.instrumento_nombre}". Debe devolverlo antes de solicitar otro.`
                  : `Ya tienes prestado: "${activeLoan?.instrumento_nombre}". Devuélvelo antes de pedir otro instrumento.`}
              </p>
            </div>
          </div>
        )}
        <form className="form" onSubmit={onSubmit}>
          {isAdmin && (
            <Field label="Socio">
              <SelectInput value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required>
                <option value="">Selecciona un socio</option>
                {usersList.map((user) => <option key={user.id} value={user.id}>{user.nombre_completo}</option>)}
              </SelectInput>
            </Field>
          )}
          <fieldset disabled={!opHours || hasActiveLoan} style={{ border: 'none', padding: 0, margin: 0 }}>
          <Field label="Instrumento disponible">
            <SelectInput value={form.inventario_id} onChange={(e) => setForm({ ...form, inventario_id: e.target.value })} required>
              <option value="">Selecciona instrumento</option>
              {instrumentos.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.tipo}</option>)}
            </SelectInput>
          </Field>
          <Field label="Motivo del préstamo">
            <TextInput
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              placeholder="Ej: Festival Cultural, Ensayo de banda..."
              required
            />
          </Field>
          <Field label="Fecha y hora de salida">
            <TextInput
              type="datetime-local"
              value={form.fecha_salida}
              onChange={(e) => setForm({ ...form, fecha_salida: e.target.value })}
              min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              required
            />
            {prestamoErrors.fecha_salida && (
              <div style={OPERATING_DATE_WARNING_STYLE}>⛔ {prestamoErrors.fecha_salida}</div>
            )}
          </Field>
          <Field label="Fecha y hora límite de devolución">
            <TextInput
              type="datetime-local"
              value={form.fecha_limite}
              onChange={(e) => setForm({ ...form, fecha_limite: e.target.value })}
              min={form.fecha_salida || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              required
            />
            {prestamoErrors.fecha_limite && (
              <div style={OPERATING_DATE_WARNING_STYLE}>⛔ {prestamoErrors.fecha_limite}</div>
            )}
          </Field>
          <button className="button primary" type="submit" disabled={!opHours || hasActiveLoan || prestamoHasErrors || isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Registrar préstamo'}
          </button>
          </fieldset>
        </form>
      </section>

      <section className="panel wide">
        <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PackageCheck size={18} /><h2>Préstamos</h2></div>
          <button className="button ghost" onClick={() => exportToCSV(data, 'prestamos')}>Exportar CSV</button>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <TextInput placeholder="Buscar por socio o instrumento..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
          Haz clic en un préstamo para ver sus detalles completos.
        </p>
        <div className="table">
          {data.map((prestamo) => (
            <div
              className="row"
              key={prestamo.id}
              onClick={() => setSelectedPrestamo(prestamo)}
              style={{ cursor: 'pointer' }}
            >
              <span>{prestamo.instrumento_nombre}</span>
              <span>{prestamo.nombre_completo}</span>
              <span>{formatDate(prestamo.fecha_limite)}</span>
              {prestamo.estado === 'ACTIVO' && <CountdownTimer fechaLimite={prestamo.fecha_limite} />}
              <Badge value={prestamo.estado} />
              {isAdmin && (prestamo.estado === 'ACTIVO' || prestamo.estado === 'VENCIDO') && (
                <button
                  className="link-button"
                  disabled={!opHours}
                  title={!opHours ? 'Solo se puede devolver de lunes a sábado hasta las 12:00' : `Registrar devolución${prestamo.estado === 'VENCIDO' ? ' (préstamo vencido)' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onReturn(prestamo.id); setPage(page); }}
                  style={{ opacity: opHours ? 1 : 0.4, cursor: opHours ? 'pointer' : 'not-allowed', color: prestamo.estado === 'VENCIDO' ? '#dc2626' : undefined }}
                >
                  Devolver{prestamo.estado === 'VENCIDO' ? ' ⚠' : ''}
                </button>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', alignItems: 'center' }}>
          <button className="button ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
          <span>Página {page} ({total} resultados)</span>
          <button className="button ghost" disabled={page * 5 >= total} onClick={() => setPage(p => p + 1)}>Siguiente</button>
        </div>
      </section>
    </div>
  );
}

function InventarioView({ isAdmin, inventario, setInventario, form, setForm, onSubmit, api }) {
  const [search, setSearch]         = useState('');
  const [fMarca, setFMarca]         = useState('');
  const [fModelo, setFModelo]       = useState('');
  const [fSerie, setFSerie]         = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const filtered = useMemo(() => {
    const q  = search.toLowerCase();
    const ma = fMarca.toLowerCase();
    const mo = fModelo.toLowerCase();
    const se = fSerie.toLowerCase();
    return (inventario || []).filter(item =>
      (!q  || item.nombre?.toLowerCase().includes(q))  &&
      (!ma || item.marca?.toLowerCase().includes(ma))  &&
      (!mo || item.modelo?.toLowerCase().includes(mo)) &&
      (!se || item.numero_serie?.toLowerCase().includes(se))
    );
  }, [inventario, search, fMarca, fModelo, fSerie]);

  const hasFilters = search || fMarca || fModelo || fSerie;

  async function changeEstado(item, nuevoEstado) {
    if (item.estado === nuevoEstado) return;
    setUpdatingId(item.id);
    try {
      await api(`/instrumentos/${item.id}`, { method: 'PUT', body: JSON.stringify({ estado: nuevoEstado }) });
      setInventario(prev => prev.map(i => i.id === item.id ? { ...i, estado: nuevoEstado, disponible: nuevoEstado === 'DISPONIBLE' ? 1 : 0 } : i));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const estadoOpts = [
    { value: 'DISPONIBLE',    label: 'Disponible',    color: '#16a34a', bg: '#dcfce7' },
    { value: 'MANTENIMIENTO', label: 'Mantenimiento', color: '#d97706', bg: '#fef3c7' },
    { value: 'BAJA',          label: 'Dañado / Baja', color: '#dc2626', bg: '#fee2e2' },
  ];

  return (
    <div className="stack">
      {isAdmin && (
        <section className="panel">
          <div className="panel-title"><Plus size={18} /><h2>Nuevo instrumento</h2></div>
          <form className="form grid-form" onSubmit={onSubmit}>
            <Field label="Nombre"><TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></Field>
            <Field label="Tipo"><TextInput value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} required /></Field>
            <Field label="Marca"><TextInput value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></Field>
            <Field label="Modelo"><TextInput value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></Field>
            <Field label="Serie"><TextInput value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} /></Field>
            <Field label="Ubicación"><TextInput value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} required /></Field>
            <button className="button primary" type="submit">Guardar instrumento</button>
          </form>
        </section>
      )}

      {/* Filtros */}
      <section className="panel" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2 1 180px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Buscar por nombre</label>
            <TextInput placeholder="Ej: Fender, Guitarra..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 130px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Marca</label>
            <TextInput placeholder="Ej: Gibson..." value={fMarca} onChange={e => setFMarca(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 130px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Modelo</label>
            <TextInput placeholder="Ej: Les Paul..." value={fModelo} onChange={e => setFModelo(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 130px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Núm. serie</label>
            <TextInput placeholder="Ej: SN-12345..." value={fSerie} onChange={e => setFSerie(e.target.value)} />
          </div>
          {hasFilters && (
            <button className="button ghost" style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap' }}
              onClick={() => { setSearch(''); setFMarca(''); setFModelo(''); setFSerie(''); }}>
              Limpiar filtros
            </button>
          )}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
          {filtered.length} instrumento{filtered.length !== 1 ? 's' : ''}{hasFilters ? ' encontrado' + (filtered.length !== 1 ? 's' : '') : ' en total'}
        </p>
      </section>

      <section className="cards-grid">
        {filtered.length === 0 && (
          <p style={{ color: 'var(--muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
            No se encontraron instrumentos con esos filtros.
          </p>
        )}
        {filtered.map((item) => (
          <article className="item-card" key={item.id}>
            <div>
              <h3>{item.nombre}</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{item.tipo}{item.marca ? ` · ${item.marca}` : ''}{item.modelo ? ` ${item.modelo}` : ''}</p>
              {item.numero_serie && (
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Serie: {item.numero_serie}</p>
              )}
            </div>

            {/* Estado: admin puede cambiarlo, socio solo lo ve */}
            {isAdmin ? (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {estadoOpts.map(opt => (
                  <button
                    key={opt.value}
                    disabled={updatingId === item.id || item.estado === 'PRESTADO'}
                    onClick={() => changeEstado(item, opt.value)}
                    style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                      cursor: item.estado === 'PRESTADO' ? 'not-allowed' : 'pointer',
                      border: item.estado === opt.value ? `2px solid ${opt.color}` : '2px solid transparent',
                      background: item.estado === opt.value ? opt.bg : '#f1f5f9',
                      color: item.estado === opt.value ? opt.color : '#64748b',
                      transition: 'all 0.15s',
                      opacity: item.estado === 'PRESTADO' && opt.value !== 'PRESTADO' ? 0.45 : 1,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
                {item.estado === 'PRESTADO' && (
                  <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700, padding: '3px 10px', background: '#fee2e2', borderRadius: '20px', border: '2px solid #dc2626' }}>PRESTADO</span>
                )}
              </div>
            ) : (
              <Badge value={item.estado} />
            )}

            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{item.ubicacion}</span>
            {item.disponible
              ? <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✓ Disponible para préstamo</span>
              : <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>No disponible para préstamo</span>
            }
          </article>
        ))}
      </section>
    </div>
  );
}

function SociosView({ api, form, setForm, onSubmit, setEditingUser }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      api(`/users?page=${page}&limit=5&search=${search}`).then(res => {
        if(res.data) {
          setData(res.data);
          setTotal(res.total);
        } else {
          setData(res);
          setTotal(res.length);
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search, form]);

  return (
    <div className="two-column">
      <section className="panel">
        <div className="panel-title"><Users size={18} /><h2>Registrar socio</h2></div>
        <form className="form" onSubmit={onSubmit}>
          <Field label="Nombre completo"><TextInput value={form.nombre_completo} onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} required /></Field>
          <Field label="Correo PUCE"><TextInput type="email" value={form.email_institucional} onChange={(e) => setForm({ ...form, email_institucional: e.target.value })} pattern=".*@pucesa\.edu\.ec$" required /></Field>
          <Field label="WhatsApp">
            <TextInput value={form.telefono_whatsapp} onChange={(e) => setForm({ ...form, telefono_whatsapp: e.target.value })} placeholder="0991234567" maxLength={10} required />
            {form.telefono_whatsapp && !/^\d{10}$/.test(form.telefono_whatsapp) && (
              <div style={OPERATING_DATE_WARNING_STYLE}>⛔ Debe tener exactamente 10 dígitos (ej: 0991234567)</div>
            )}
          </Field>
          <Field label="Nivel">
            <SelectInput value={form.nivel_habilidad} onChange={(e) => setForm({ ...form, nivel_habilidad: e.target.value })}>
              <option value="PRINCIPIANTE">PRINCIPIANTE</option>
              <option value="INTERMEDIO">INTERMEDIO</option>
              <option value="AVANZADO">AVANZADO</option>
              <option value="PROFESIONAL">PROFESIONAL</option>
            </SelectInput>
          </Field>
          <Field label="Rol">
            <SelectInput value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              <option value="SOCIO">SOCIO</option>
              <option value="ADMIN">ADMIN</option>
            </SelectInput>
          </Field>
          <Field label="Contraseña inicial"><TextInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
          <button className="button primary" type="submit">Crear socio</button>
        </form>
      </section>
      <section className="panel wide">
        <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} /><h2>Socios</h2></div>
          <button className="button ghost" onClick={() => exportToCSV(data, 'socios')}>Exportar CSV</button>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <TextInput placeholder="Buscar por nombre o correo..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="table">
          {data.map((user) => (
            <div className="row" key={user.id} style={{ cursor: "pointer" }} onClick={() => setEditingUser(user)} title="Clic para editar">
              <span>{user.nombre_completo}</span>
              <span>{user.email_institucional}</span>
              <span>{user.nivel_habilidad}</span>
              <Badge value={user.rol} />
              <Badge value={user.estado} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', alignItems: 'center' }}>
          <button className="button ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
          <span>Página {page} ({total} resultados)</span>
          <button className="button ghost" disabled={page * 5 >= total} onClick={() => setPage(p => p + 1)}>Siguiente</button>
        </div>
      </section>
    </div>
  );
}

function EditSalaModal({ sala, onClose, onSave }) {
  const [editForm, setEditForm] = useState({
    nombre:     sala.nombre     || '',
    tipo:       sala.tipo       || 'CUBICULO',
    capacidad:  sala.capacidad  || 1,
    equipamiento: sala.equipamiento || '',
    estado:     sala.estado     || 'ACTIVA',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      await onSave(sala.id, editForm);
      onClose();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  const estadoColor = { ACTIVA: '#16a34a', MANTENIMIENTO: '#d97706', INACTIVA: '#94a3b8' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', width: '100%', maxWidth: '480px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Editando sala</p>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{sala.nombre}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>

        {/* Estado actual visual */}
        <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Estado actual:</span>
          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: estadoColor[editForm.estado] || '#64748b' }}>● {editForm.estado}</span>
        </div>

        <form onSubmit={handleSave} className="form" style={{ padding: '20px 24px 24px' }}>
          <Field label="Nombre de la sala">
            <TextInput value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} required />
          </Field>
          <Field label="Tipo">
            <SelectInput value={editForm.tipo} onChange={e => setEditForm({ ...editForm, tipo: e.target.value })}>
              <option value="CUBICULO">Cubículo</option>
              <option value="SALON_ACUSTICO">Salón Acústico</option>
              <option value="ESTUDIO">Estudio de Grabación</option>
            </SelectInput>
          </Field>
          <Field label="Capacidad (personas)">
            <TextInput type="number" min="1" max="500" value={editForm.capacidad} onChange={e => setEditForm({ ...editForm, capacidad: e.target.value })} required />
          </Field>
          <Field label="Equipamiento (opcional)">
            <TextInput value={editForm.equipamiento} onChange={e => setEditForm({ ...editForm, equipamiento: e.target.value })} placeholder="Ej: Piano, Amplificadores, Pantallas..." />
          </Field>
          <Field label="Estado">
            <SelectInput value={editForm.estado} onChange={e => setEditForm({ ...editForm, estado: e.target.value })}>
              <option value="ACTIVA">Activa</option>
              <option value="MANTENIMIENTO">En mantenimiento</option>
              <option value="INACTIVA">Inactiva</option>
            </SelectInput>
          </Field>
          {err && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0 0 8px' }}>⚠ {err}</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" className="button ghost" style={{ flex: 1 }} onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="button primary" style={{ flex: 2 }} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SalasView({ salas, setSalas, form, setForm, onSubmit, api, isAdmin }) {
  const [editingSala, setEditingSala] = useState(null);

  async function saveSala(id, data) {
    await api(`/salas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    setSalas(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }

  const estadoStyle = {
    ACTIVA:        { color: '#15803d', bg: '#dcfce7', border: '#86efac' },
    MANTENIMIENTO: { color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
    INACTIVA:      { color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  };

  return (
    <div className="two-column">
      {editingSala && (
        <EditSalaModal sala={editingSala} onClose={() => setEditingSala(null)} onSave={saveSala} />
      )}

      {isAdmin && (
      <section className="panel">
        <div className="panel-title"><DoorOpen size={18} /><h2>Nueva sala</h2></div>
        <form className="form" onSubmit={onSubmit}>
          <Field label="Nombre"><TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></Field>
          <Field label="Tipo">
            <SelectInput value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="CUBICULO">Cubículo</option>
              <option value="SALON_ACUSTICO">Salón Acústico</option>
              <option value="ESTUDIO">Estudio de Grabación</option>
            </SelectInput>
          </Field>
          <Field label="Capacidad"><TextInput type="number" min="1" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} required /></Field>
          <button className="button primary" type="submit">Guardar sala</button>
        </form>
      </section>
      )}

      <section className="cards-grid wide">
        {salas.map((sala) => {
          const st = estadoStyle[sala.estado] || estadoStyle.INACTIVA;
          return (
            <article
              key={sala.id}
              className="item-card"
              style={{ cursor: isAdmin ? 'pointer' : 'default', position: 'relative', transition: 'box-shadow 0.15s', border: `1.5px solid ${st.border}` }}
              onClick={() => isAdmin && setEditingSala(sala)}
              title={isAdmin ? 'Clic para editar' : ''}
            >
              {isAdmin && (
                <span style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>✏ Editar</span>
              )}
              <div>
                <h3 style={{ margin: '0 0 4px' }}>{sala.nombre}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>
                  {sala.tipo?.replace('_', ' ')} · {sala.capacidad} personas
                </p>
                {sala.equipamiento && (
                  <p style={{ fontSize: '0.73rem', color: '#94a3b8', margin: '4px 0 0' }}>{sala.equipamiento}</p>
                )}
              </div>
              <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.border}`, marginTop: '6px' }}>
                {sala.estado}
              </span>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function PrestamoDetailModal({ prestamo, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-panel, #fff)', borderRadius: '14px', padding: '2rem', minWidth: '420px', maxWidth: '560px', width: '90%', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Detalle del Préstamo</h2>
            <p style={{ fontSize: '0.82rem', color: '#888', margin: '4px 0 0' }}>ID #{prestamo.id}</p>
          </div>
          <Badge value={prestamo.estado} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ fontSize: '0.72rem', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instrumento</p>
            <p style={{ fontWeight: '600', margin: '3px 0 0' }}>{prestamo.instrumento_nombre}</p>
            <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>{prestamo.tipo}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Socio</p>
            <p style={{ fontWeight: '600', margin: '3px 0 0' }}>{prestamo.nombre_completo}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha de salida</p>
            <p style={{ fontWeight: '600', margin: '3px 0 0' }}>{formatDate(prestamo.fecha_salida)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha límite</p>
            <p style={{ fontWeight: '600', margin: '3px 0 0' }}>{formatDate(prestamo.fecha_limite)}</p>
          </div>
          {prestamo.fecha_devolucion && (
            <div>
              <p style={{ fontSize: '0.72rem', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Devuelto el</p>
              <p style={{ fontWeight: '600', margin: '3px 0 0' }}>{formatDate(prestamo.fecha_devolucion)}</p>
            </div>
          )}
          {prestamo.estado === 'ACTIVO' && (
            <div>
              <p style={{ fontSize: '0.72rem', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tiempo restante</p>
              <div style={{ marginTop: '4px' }}><CountdownTimer fechaLimite={prestamo.fecha_limite} /></div>
            </div>
          )}
          {prestamo.motivo && (
            <div style={{ gridColumn: '1/-1' }}>
              <p style={{ fontSize: '0.72rem', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Motivo</p>
              <p style={{ margin: '3px 0 0' }}>{prestamo.motivo}</p>
            </div>
          )}
          {prestamo.observaciones && (
            <div style={{ gridColumn: '1/-1' }}>
              <p style={{ fontSize: '0.72rem', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observaciones</p>
              <p style={{ fontSize: '0.9rem', margin: '3px 0 0' }}>{prestamo.observaciones}</p>
            </div>
          )}
        </div>

        <button className="button ghost" style={{ width: '100%' }} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

function EditSocioModal({ socio, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre_completo: socio.nombre_completo || '',
    telefono_whatsapp: socio.telefono_whatsapp || '',
    nivel_habilidad: socio.nivel_habilidad || 'PRINCIPIANTE',
    rol: socio.rol || 'SOCIO',
    estado: socio.estado || 'ACTIVO',
  });

  function handleSubmit(e) {
    e.preventDefault();
    onSave(socio.id, form);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'var(--bg-panel, #fff)', borderRadius: '12px',
        padding: '2rem', minWidth: '360px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Editar Socio</h2>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>{socio.email_institucional}</p>
        <form className="form" onSubmit={handleSubmit}>
          <Field label="Nombre completo">
            <TextInput value={form.nombre_completo} onChange={e => setForm({ ...form, nombre_completo: e.target.value })} required />
          </Field>
          <Field label="Teléfono WhatsApp">
            <TextInput value={form.telefono_whatsapp} onChange={e => setForm({ ...form, telefono_whatsapp: e.target.value })} placeholder="0991234567" maxLength={10} />
            {form.telefono_whatsapp && !/^\d{10}$/.test(form.telefono_whatsapp) && (
              <div style={OPERATING_DATE_WARNING_STYLE}>⛔ Debe tener exactamente 10 dígitos (ej: 0991234567)</div>
            )}
          </Field>
          <Field label="Nivel de habilidad">
            <SelectInput value={form.nivel_habilidad} onChange={e => setForm({ ...form, nivel_habilidad: e.target.value })}>
              <option value="PRINCIPIANTE">PRINCIPIANTE</option>
              <option value="INTERMEDIO">INTERMEDIO</option>
              <option value="AVANZADO">AVANZADO</option>
              <option value="PROFESIONAL">PROFESIONAL</option>
            </SelectInput>
          </Field>
          <Field label="Rol">
            <SelectInput value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
              <option value="SOCIO">SOCIO</option>
              <option value="ADMIN">ADMIN</option>
            </SelectInput>
          </Field>
          <Field label="Estado">
            <SelectInput value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
              <option value="BLOQUEADO">BLOQUEADO</option>
            </SelectInput>
          </Field>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="button primary" type="submit" style={{ flex: 1 }}>Guardar</button>
            <button className="button ghost" type="button" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
