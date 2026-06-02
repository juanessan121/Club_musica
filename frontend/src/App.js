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

import StatisticsView from './StatisticsView';

function resolveApiUrl() {
  const configured = process.env.REACT_APP_API_URL;
  if (configured && configured !== 'http://localhost/api') return configured;
  if (window.location.port === '3001') return 'http://localhost:5000/api';
  return `${window.location.origin}/api`;
}

const API_URL = resolveApiUrl();
const DEFAULT_PASSWORD = 'Musica2026!';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge, adminOnly: false },
  { id: 'reservas', label: 'Reservas', icon: CalendarDays, adminOnly: false },
  { id: 'prestamos', label: 'Préstamos', icon: PackageCheck, adminOnly: false },
  { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3, adminOnly: false },
  { id: 'inventario', label: 'Inventario', icon: Guitar, adminOnly: false },
  { id: 'socios', label: 'Socios', icon: Users, adminOnly: true },
  { id: 'salas', label: 'Salas', icon: DoorOpen, adminOnly: true },
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
  evento_universidad: '',
  documento_garantia: 'Cédula de Identidad',
  fecha_limite: '',
  terminos_aceptados: true,
};

const emptySocio = {
  nombre_completo: '',
  email_institucional: '',
  telefono_whatsapp: '',
  nivel_habilidad: 'PRINCIPIANTE',
  rol: 'SOCIO',
  password: DEFAULT_PASSWORD,
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
  return value.replace('T', ' ').slice(0, 16);
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [login, setLogin] = useState({ email: 'juan.sandoval@pucesa.edu.ec', password: DEFAULT_PASSWORD });

  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [salas, setSalas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [prestamos, setPrestamos] = useState([]);

  const [reservaForm, setReservaForm] = useState(emptyReserva);
  const [prestamoForm, setPrestamoForm] = useState(emptyPrestamo);
  const [socioForm, setSocioForm] = useState(emptySocio);
  const [instrumentoForm, setInstrumentoForm] = useState(emptyInstrumento);
  const [salaForm, setSalaForm] = useState(emptySala);

  const visibleNav = useMemo(() => navItems.filter((item) => !item.adminOnly || isAdmin), [isAdmin]);
  const availableInstruments = inventario.filter((item) => item.disponible && item.estado === 'DISPONIBLE');

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
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
      setReservaForm({ ...emptyReserva, user_id: data.user.id });
      setPrestamoForm({ ...emptyPrestamo, user_id: data.user.id });
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
  }

  async function submitReserva(event) {
    event.preventDefault();
    try {
      const inicio = new Date(reservaForm.fecha_inicio);
      const fin = new Date(reservaForm.fecha_fin);
      const ahora = new Date();

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
    try {
      await api('/prestamos/solicitar', {
        method: 'POST',
        body: JSON.stringify({ ...prestamoForm, user_id: isAdmin ? prestamoForm.user_id : currentUser.id }),
      });
      setMessage({ text: 'Préstamo registrado correctamente.', type: 'success' });
      setPrestamoForm({ ...emptyPrestamo, user_id: isAdmin ? '' : currentUser.id });
      await loadData();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
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

  if (!currentUser) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div className="brand-mark"><Guitar size={34} /></div>
          <h1>Club de Música</h1>
          <p>Gestión de socios, salas, préstamos e inventario.</p>
          <Message message={message} />
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
          <div className="hint">
            <strong>Semilla:</strong> juan.sandoval@pucesa.edu.ec / {DEFAULT_PASSWORD}
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
          <Dashboard stats={stats} reservas={reservas} prestamos={prestamos} inventario={inventario} />
        )}
        {activeView === 'reservas' && (
          <ReservasView
            isAdmin={isAdmin}
            usersList={usersList}
            salas={salas}
            reservas={reservas}
            calendarEvents={calendarEvents}
            form={reservaForm}
            setForm={setReservaForm}
            onSubmit={submitReserva}
            onCancel={cancelReserva}
          />
        )}
        {activeView === 'prestamos' && (
          <PrestamosView
            isAdmin={isAdmin}
            usersList={usersList}
            prestamos={prestamos}
            instrumentos={availableInstruments}
            form={prestamoForm}
            setForm={setPrestamoForm}
            onSubmit={submitPrestamo}
            onReturn={devolverPrestamo}
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
          <SociosView usersList={usersList} form={socioForm} setForm={setSocioForm} onSubmit={submitSocio} />
        )}
        {activeView === 'salas' && (
          <SalasView salas={salas} form={salaForm} setForm={setSalaForm} onSubmit={submitSala} />
        )}
        {activeView === 'estadisticas' && (
          <StatisticsView api={api} />
        )}
      </section>
    </div>
  );
}

function Dashboard({ stats, reservas, prestamos, inventario }) {
  const cards = [
    ['Socios activos', stats?.socios_activos ?? 0],
    ['Instrumentos', stats?.instrumentos ?? inventario.length],
    ['Salas disponibles', stats?.salas_disponibles ?? 0],
    ['Reservas confirmadas', stats?.reservas_confirmadas ?? reservas.length],
    ['Préstamos activos', stats?.prestamos_activos ?? prestamos.filter((p) => p.estado === 'ACTIVO').length],
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
      <section className="panel">
        <div className="panel-title">
          <Activity size={18} />
          <h2>Próximas reservas</h2>
        </div>
        <div className="table">
          {(stats?.proximas_reservas || reservas.slice(0, 5)).map((reserva) => (
            <div className="row" key={reserva.id}>
              <span>{reserva.sala_nombre}</span>
              <span>{reserva.nombre_completo || 'Mi reserva'}</span>
              <span>{formatDate(reserva.fecha_inicio)}</span>
              <Badge value={reserva.estado || 'CONFIRMADA'} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReservasView({ isAdmin, usersList, salas, reservas, calendarEvents, form, setForm, onSubmit, onCancel }) {
  return (
    <div className="two-column">
      <section className="panel">
        <div className="panel-title"><Plus size={18} /><h2>Nueva reserva</h2></div>
        <form className="form" onSubmit={onSubmit}>
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
            <TextInput type="datetime-local" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} required />
          </Field>
          <Field label="Fin">
            <TextInput type="datetime-local" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} required />
          </Field>
          <label className="checkline">
            <input type="checkbox" checked={form.terminos_aceptados} onChange={(e) => setForm({ ...form, terminos_aceptados: e.target.checked })} />
            Acepto las condiciones de uso de sala.
          </label>
          <button className="button primary" type="submit">Confirmar reserva</button>
        </form>
      </section>

      <section className="panel wide">
        <div className="panel-title"><CalendarDays size={18} /><h2>Calendario</h2></div>
        <div className="calendar-list">
          {calendarEvents.map((event) => (
            <article className="calendar-item" key={event.id}>
              <div>
                <strong>{event.sala_nombre}</strong>
                <span>{event.nombre_completo}</span>
              </div>
              <time>{formatDate(event.start)} - {formatDate(event.end).slice(11)}</time>
              <Badge value={event.estado} />
            </article>
          ))}
        </div>
      </section>

      <section className="panel full">
        <div className="panel-title"><CalendarDays size={18} /><h2>Reservas registradas</h2></div>
        <div className="table">
          {reservas.map((reserva) => (
            <div className="row" key={reserva.id}>
              <span>{reserva.sala_nombre}</span>
              <span>{reserva.nombre_completo || 'Mi reserva'}</span>
              <span>{formatDate(reserva.fecha_inicio)} - {formatDate(reserva.fecha_fin).slice(11)}</span>
              <Badge value={reserva.estado} />
              {reserva.estado !== 'CANCELADA' && <button className="link-button" onClick={() => onCancel(reserva.id)}>Cancelar</button>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PrestamosView({ isAdmin, usersList, prestamos, instrumentos, form, setForm, onSubmit, onReturn }) {
  return (
    <div className="two-column">
      <section className="panel">
        <div className="panel-title"><PackageCheck size={18} /><h2>Registrar préstamo</h2></div>
        <form className="form" onSubmit={onSubmit}>
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
          <Field label="Evento universitario">
            <TextInput value={form.evento_universidad} onChange={(e) => setForm({ ...form, evento_universidad: e.target.value })} required />
          </Field>
          <Field label="Fecha límite">
            <TextInput type="datetime-local" value={form.fecha_limite} onChange={(e) => setForm({ ...form, fecha_limite: e.target.value })} required />
          </Field>
          <button className="button primary" type="submit">Registrar préstamo</button>
        </form>
      </section>

      <section className="panel wide">
        <div className="panel-title"><PackageCheck size={18} /><h2>Préstamos</h2></div>
        <div className="table">
          {prestamos.map((prestamo) => (
            <div className="row" key={prestamo.id}>
              <span>{prestamo.instrumento_nombre}</span>
              <span>{prestamo.nombre_completo}</span>
              <span>{formatDate(prestamo.fecha_limite)}</span>
              <Badge value={prestamo.estado} />
              {prestamo.estado === 'ACTIVO' && <button className="link-button" onClick={() => onReturn(prestamo.id)}>Devolver</button>}
            </div>
          ))}
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
            <Badge value={item.disponible ? 'DISPONIBLE' : 'PRESTADO'} />
            <span>{item.ubicacion}</span>
            <Badge value={item.estado} />
          </article>
        ))}
      </section>
    </div>
  );
}

function SociosView({ usersList, form, setForm, onSubmit }) {
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
        <div className="panel-title"><Users size={18} /><h2>Socios</h2></div>
        <div className="table">
          {usersList.map((user) => (
            <div className="row" key={user.id}>
              <span>{user.nombre_completo}</span>
              <span>{user.email_institucional}</span>
              <span>{user.nivel_habilidad}</span>
              <Badge value={user.rol} />
              <Badge value={user.estado} />
            </div>
          ))}
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
