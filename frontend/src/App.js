import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  DoorOpen,
  Gauge,
  Guitar,
  LogOut,
  PackageCheck,
  Plus,
  RefreshCw,
  Users,
  XCircle,
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

function Badge({ value }) {
  const key = String(value || 'default').toLowerCase();
  return <span className={`badge badge-${key}`}>{value || 'N/D'}</span>;
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return <input className="input" {...props} />;
}

function SelectInput(props) {
  return <select className="input" {...props} />;
}

function Message({ message }) {
  if (!message.text) return null;
  const Icon = message.type === 'success' ? CheckCircle2 : XCircle;
  return (
    <div className={`message ${message.type}`}>
      <Icon size={18} />
      <span>{message.text}</span>
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  const s = value.replace('T', ' ').slice(0, 16);
  const [datePart, timePart] = s.split(' ');
  if (!timePart || timePart === '00:00') return datePart;
  return `${datePart} ${timePart}`;
}

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

function isWithinOperatingHours() {
  const now = new Date();
  const day = now.getDay(); // 0=Dom, 1=Lun … 6=Sáb
  if (day === 0) return false;
  if (day === 6 && now.getHours() >= 12) return false;
  return true;
}

function isValidOperatingDate(dateStr) {
  if (!dateStr) return true;
  // datetime-local strings (YYYY-MM-DDTHH:MM) are parsed as local time — no UTC shift
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
  const day = d.getDay(); // 0=Dom, 6=Sáb
  if (day === 0) return false;
  if (day === 6 && d.getHours() >= 12) return false;
  return true;
}

const OPERATING_DATE_ERROR = 'No se permiten reservas ni préstamos en domingo ni sábado a partir de las 12:00.';
const OPERATING_DATE_WARNING_STYLE = {
  background: '#fef2f2',
  border: '1.5px solid #ef4444',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#b91c1c',
  fontSize: '0.82rem',
  fontWeight: 600,
  marginTop: '4px',
};

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

function CalendarioView({ events, currentUser, setActiveView, setForm }) {
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
      className = 'calendar-event-admin'; // Admin viewing someone else's
    }
    return { className };
  };

  const toLocalISOString = (date) => {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleSelectSlot = ({ start, end }) => {
    if(setForm) {
      setForm(prev => ({
        ...prev,
        fecha_inicio: toLocalISOString(start),
        fecha_fin: toLocalISOString(end)
      }));
    }
  };

  return (
    <div className="panel full" style={{ height: '85vh', display: 'flex', flexDirection: 'column', border: 'none', boxShadow: 'none', padding: '0' }}>
      <div className="panel-title" style={{ marginBottom: '15px' }}>
        <CalendarDays size={22} style={{ color: 'var(--primary)' }} />
        <h2 style={{ fontSize: '20px' }}>Calendario de Reservas</h2>
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
          views={['month', 'week', 'day']}
          defaultView="week"
          min={new Date(0, 0, 0, 8, 0, 0)} // Empieza a las 8am
          max={new Date(0, 0, 0, 22, 0, 0)} // Termina a las 10pm
          eventPropGetter={eventPropGetter}
          messages={{
            next: "Siguiente",
            previous: "Anterior",
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            day: "Día"
          }}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('currentUser')) || null);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true');
  const [activeView, setActiveView] = useState('dashboard');
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
  const availableInstruments = inventario.filter((item) => item.disponible && item.estado === 'DISPONIBLE');

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
    setCurrentUser(null);
    setIsAdmin(false);
    setActiveView('dashboard');
    setMessage({ text: '', type: '' });
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('token');
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
      await loadData();
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
      await loadData();
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
      await loadData();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function devolverPrestamo(id) {
    try {
      await api(`/prestamos/${id}/devolver`, { method: 'POST', body: JSON.stringify({ estado_instrumento: 'DISPONIBLE' }) });
      setMessage({ text: 'Instrumento marcado como devuelto.', type: 'success' });
      await loadData();
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
      await loadData();
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
      await loadData();
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
      await loadData();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  async function handleEditSave(userId, updatedData) {
    try {
      await api(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(updatedData) });
      setEditingUser(null);
      setMessage({ text: 'Socio actualizado correctamente.', type: 'success' });
      await loadData();
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
              <button key={item.id} className={`nav-button ${activeView === item.id ? 'active' : ''}`} onClick={() => setActiveView(item.id)}>
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
            <button className="button ghost" onClick={() => loadData()} disabled={loading}>
              <RefreshCw size={16} />
              Actualizar
            </button>
            <button className="button ghost" onClick={logout}>
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </header>

        <Message message={message} />

        {activeView === 'dashboard' && (
          <Dashboard isAdmin={isAdmin} stats={stats} reservas={reservas} prestamos={prestamos} inventario={inventario} currentUser={currentUser} />
        )}
        {activeView === 'calendario' && (
          <CalendarioView events={calendarEvents} currentUser={currentUser} setActiveView={setActiveView} setForm={setReservaForm} />
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
            form={instrumentoForm}
            setForm={setInstrumentoForm}
            onSubmit={submitInstrumento}
          />
        )}
        {activeView === 'socios' && (
          <SociosView api={api} form={socioForm} setForm={setSocioForm} onSubmit={submitSocio} setEditingUser={setEditingUser} />
        )}
        {activeView === 'salas' && (
          <SalasView salas={salas} form={salaForm} setForm={setSalaForm} onSubmit={submitSala} />
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
          <Field label="WhatsApp"><TextInput value={perfilForm.telefono_whatsapp} onChange={(e) => setPerfilForm({ ...perfilForm, telefono_whatsapp: e.target.value })} required /></Field>
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

function Dashboard({ isAdmin, stats, reservas, prestamos, inventario, currentUser }) {
  const myLoans = currentUser
    ? prestamos.filter((p) => p.user_id === currentUser.id && p.estado === 'ACTIVO')
    : [];

  const cards = isAdmin ? [
    ['Socios activos', stats?.socios_activos ?? 0],
    ['Instrumentos', stats?.instrumentos ?? inventario.length],
    ['Salas disponibles', stats?.salas_disponibles ?? 0],
    ['Reservas confirmadas', stats?.reservas_confirmadas ?? reservas.length],
    ['Préstamos activos', stats?.prestamos_activos ?? prestamos.filter((p) => p.estado === 'ACTIVO').length],
  ] : [
    ['Tus reservas confirmadas', stats?.reservas_confirmadas ?? 0],
    ['Tus préstamos activos', stats?.prestamos_activos ?? 0],
  ];

  return (
    <div className="stack">
      <div className="metrics-grid">
        {cards.map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      {!isAdmin && myLoans.length > 0 && (
        <section className="panel">
          <div className="panel-title">
            <PackageCheck size={18} />
            <h2>Tus préstamos activos</h2>
          </div>
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

      <section className="panel">
        <div className="panel-title">
          <Activity size={18} />
          <h2>Próximas reservas</h2>
        </div>
        <div className="table">
          {(() => {
            const upcoming = stats?.proximas_reservas?.length > 0
              ? stats.proximas_reservas
              : reservas.filter(r => new Date(r.fecha_inicio) > new Date() && r.estado === 'CONFIRMADA').slice(0, 5);
            if (upcoming.length === 0) {
              return <p style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>No hay reservas próximas pendientes.</p>;
            }
            return upcoming.map((reserva) => (
              <div className="row" key={reserva.id}>
                <span>{reserva.sala_nombre}</span>
                <span>{reserva.nombre_completo || 'Mi reserva'}</span>
                <span>{formatDate(reserva.fecha_inicio)}</span>
                <Badge value={reserva.estado || 'CONFIRMADA'} />
              </div>
            ));
          })()}
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

  // Validación en tiempo real — se recalcula con cada cambio del formulario
  const formErrors = (() => {
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

    return errors;
  })();
  const formHasErrors = Object.keys(formErrors).length > 0;

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
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: 'auto' }}>Haz clic y arrastra para pre-llenar el formulario</span>
          </div>
          <div style={{ flex: 1, minHeight: '550px' }}>
            <Calendar
              localizer={localizer}
              events={(calendarEvents || []).map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end), title: e.sala_nombre ? `${e.sala_nombre} - ${e.nombre_completo || ''}` : (e.title || 'Reservada') }))}
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
                if (event.socio_id === currentUser?.id) return { style: { backgroundColor: '#dcfce7', color: '#166534', borderLeft: '4px solid #16a34a', borderRadius: '6px' } };
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
          <fieldset disabled={!opHours || hasActiveLoan} style={{ border: 'none', padding: 0, margin: 0 }}>
          {isAdmin && (
            <Field label="Socio">
              <SelectInput value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required>
                <option value="">Selecciona un socio</option>
                {usersList.map((user) => <option key={user.id} value={user.id}>{user.nombre_completo}</option>)}
              </SelectInput>
            </Field>
          )}
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
              {isAdmin && prestamo.estado === 'ACTIVO' && (
                <button
                  className="link-button"
                  disabled={!opHours}
                  title={!opHours ? 'Solo se puede devolver de lunes a sábado hasta las 12:00' : ''}
                  onClick={(e) => { e.stopPropagation(); onReturn(prestamo.id); setPage(page); }}
                  style={{ opacity: opHours ? 1 : 0.4, cursor: opHours ? 'pointer' : 'not-allowed' }}
                >
                  Devolver
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

function InventarioView({ isAdmin, inventario, form, setForm, onSubmit }) {
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
            <Field label="Estado">
              <SelectInput value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="DISPONIBLE">DISPONIBLE</option>
                <option value="PRESTADO">PRESTADO</option>
                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                <option value="BAJA">BAJA</option>
              </SelectInput>
            </Field>
            <Field label="Ubicación"><TextInput value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} required /></Field>
            <button className="button primary" type="submit">Guardar instrumento</button>
          </form>
        </section>
      )}
      <section className="cards-grid">
        {inventario.map((item) => (
          <article className="item-card" key={item.id}>
            <div>
              <h3>{item.nombre}</h3>
              <p>{item.tipo} · {item.marca || 'Sin marca'} {item.modelo || ''}</p>
            </div>
            <Badge value={item.estado} />
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
          <Field label="WhatsApp"><TextInput value={form.telefono_whatsapp} onChange={(e) => setForm({ ...form, telefono_whatsapp: e.target.value })} required /></Field>
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

function SalasView({ salas, form, setForm, onSubmit }) {
  return (
    <div className="two-column">
      <section className="panel">
        <div className="panel-title"><DoorOpen size={18} /><h2>Nueva sala</h2></div>
        <form className="form" onSubmit={onSubmit}>
          <Field label="Nombre"><TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></Field>
          <Field label="Tipo">
            <SelectInput value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="CUBICULO">CUBICULO</option>
              <option value="SALON_ACUSTICO">SALON_ACUSTICO</option>
              <option value="ESTUDIO">ESTUDIO</option>
            </SelectInput>
          </Field>
          <Field label="Capacidad"><TextInput type="number" min="1" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} required /></Field>
          <Field label="Estado">
            <SelectInput value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="ACTIVA">ACTIVA</option>
              <option value="MANTENIMIENTO">MANTENIMIENTO</option>
              <option value="INACTIVA">INACTIVA</option>
            </SelectInput>
          </Field>
          <button className="button primary" type="submit">Guardar sala</button>
        </form>
      </section>
      <section className="cards-grid wide">
        {salas.map((sala) => (
          <article className="item-card" key={sala.id}>
            <h3>{sala.nombre}</h3>
            <p>{sala.capacidad} personas</p>
            <Badge value={sala.estado} />
          </article>
        ))}
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
            <TextInput value={form.telefono_whatsapp} onChange={e => setForm({ ...form, telefono_whatsapp: e.target.value })} />
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
