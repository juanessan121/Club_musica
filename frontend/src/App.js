import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Calendar, Plus, X, LogOut, CheckCircle2, AlertCircle, Clock, MapPin, Tag, Activity } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/api';

// --- ANIMATION VARIANTS ---
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const modalOverlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const modalSlide = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 200 } },
  exit: { x: '100%', opacity: 0, transition: { ease: "easeInOut" } }
};

// --- HELPER COMPONENTS ---
const Badge = ({ children, type }) => {
  const styles = {
    excelente: 'bg-green-100 text-green-800 border-green-200',
    bueno: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    regular: 'bg-orange-100 text-orange-800 border-orange-200',
    dañado: 'bg-red-100 text-red-800 border-red-200',
    confirmada: 'bg-green-100 text-green-800 border-green-200',
    pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  const colorClass = styles[type?.toLowerCase()] || styles.default;
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.6rem', borderRadius: '9999px', border: '1px solid', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} className={colorClass}>
      {children}
    </span>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginLeft: '0.2rem' }}>{label}</label>
    <input 
      className="focus-ring"
      style={{ 
        padding: '0.75rem 1rem', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        fontSize: '0.95rem',
        color: '#1e293b',
        transition: 'all 0.2s ease'
      }} 
      {...props} 
    />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginLeft: '0.2rem' }}>{label}</label>
    <select 
      className="focus-ring"
      style={{ 
        padding: '0.75rem 1rem', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        fontSize: '0.95rem',
        color: '#1e293b',
        transition: 'all 0.2s ease',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 1rem center',
        backgroundSize: '1em'
      }} 
      {...props} 
    >
      {children}
    </select>
  </div>
);

export default function App() {
  const [inventario, setInventario] = useState([]);
  const [users, setUsers] = useState([]);
  const [userReservations, setUserReservations] = useState([]);
  const [mensaje, setMensaje] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Sesión
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');

  // Formularios
  const [reservaForm, setReservaForm] = useState({ user_id: '', fecha_inicio: '', fecha_fin: '' });
  const [socioForm, setSocioForm] = useState({ nombre_completo: '', email_institucional: '', telefono_whatsapp: '', instrumento_principal: '' });
  const [socioMensaje, setSocioMensaje] = useState({ text: '', type: '' });

  const [instrumentoForm, setInstrumentoForm] = useState({ nombre: '', tipo: 'Guitarra', estado: 'excelente', ubicacion: '' });
  const [showInstrumentModal, setShowInstrumentModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchData();
      if (!isAdmin) {
        fetchUserReservations(currentUser.id);
        setReservaForm(prev => ({ ...prev, user_id: currentUser.id }));
      }
    }
  }, [currentUser, isAdmin]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail })
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentUser(data.user);
        setIsAdmin(data.is_admin);
      } else {
        setLoginError(data.error);
      }
    } catch (error) {
      setLoginError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setLoginEmail('');
    setInventario([]);
    setUsers([]);
    setUserReservations([]);
    setMensaje({ text: '', type: '' });
    setReservaForm({ user_id: '', fecha_inicio: '', fecha_fin: '' });
  };

  const fetchData = async () => {
    try {
      const invResponse = await fetch(`${API_URL}/inventario`);
      setInventario(await invResponse.json());

      if (isAdmin) {
        const userResponse = await fetch(`${API_URL}/users`);
        setUsers(await userResponse.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchUserReservations = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/reservas/${userId}`);
      setUserReservations(await response.json());
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };

  const handleReservar = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje({ text: '', type: '' });
    try {
      const response = await fetch(`${API_URL}/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservaForm)
      });
      const data = await response.json();
      if (response.ok) {
        setMensaje({ text: '¡Reserva confirmada! Revisa tu WhatsApp.', type: 'success' });
        setReservaForm(prev => ({ user_id: isAdmin ? '' : prev.user_id, fecha_inicio: '', fecha_fin: '' }));
        if (!isAdmin) fetchUserReservations(currentUser.id);
      } else {
        setMensaje({ text: data.error, type: 'error' });
      }
    } catch (error) {
      setMensaje({ text: 'Error de conexión', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgregarSocio = async (e) => {
    e.preventDefault();
    setSocioMensaje({ text: '', type: '' });
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(socioForm)
      });
      const data = await response.json();
      if (response.ok) {
        setSocioMensaje({ text: 'Socio registrado exitosamente.', type: 'success' });
        setSocioForm({ nombre_completo: '', email_institucional: '', telefono_whatsapp: '', instrumento_principal: '' });
        fetchData();
      } else {
        setSocioMensaje({ text: data.error, type: 'error' });
      }
    } catch (error) {
      setSocioMensaje({ text: 'Error de red', type: 'error' });
    }
  };

  const handleAgregarInstrumento = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/inventario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instrumentoForm)
      });
      if (response.ok) {
        setShowInstrumentModal(false);
        setInstrumentoForm({ nombre: '', tipo: 'Guitarra', estado: 'excelente', ubicacion: '' });
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- LOGIN VIEW ---
  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', position: 'relative', overflow: 'hidden' }}>
        {/* Decoraciones de fondo */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '500px', height: '500px', background: 'rgba(96, 165, 250, 0.2)', borderRadius: '50%', filter: 'blur(60px)' }} />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass-panel"
          style={{ padding: '3rem', borderRadius: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative', zIndex: 10 }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '20px', color: '#2563eb' }}>
              <Music size={40} strokeWidth={1.5} />
            </div>
          </div>
          <h2 style={{ textAlign: 'center', margin: '0 0 0.5rem 0', fontSize: '1.8rem', color: '#1e293b' }}>Club de Música</h2>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem' }}>Ingresa con tu correo institucional pucesa.edu.ec</p>
          
          {loginError && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              {loginError}
            </motion.div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input 
              label="Correo Electrónico"
              type="email" 
              value={loginEmail} 
              onChange={(e) => setLoginEmail(e.target.value)} 
              required 
              placeholder="nombre@pucesa.edu.ec"
              disabled={isLoading}
            />
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={isLoading}
              style={{ padding: '0.9rem', background: '#2563eb', color: 'white', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600, borderRadius: '12px', fontSize: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
            >
              {isLoading ? <div className="spinner" style={{ border: '2px solid transparent', borderTopColor: 'white', borderRadius: '50%', width: '20px', height: '20px' }} /> : 'Acceder al Panel'}
            </motion.button>
          </form>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(241, 245, 249, 0.5)', borderRadius: '12px', fontSize: '0.8rem', color: '#475569' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Cuentas de prueba:</strong></p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li>Admin: juan.sandoval@pucesa.edu.ec</li>
              <li>Usuario: javier.herrada@pucesa.edu.ec</li>
            </ul>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#eff6ff', padding: '0.6rem', borderRadius: '12px', color: '#2563eb' }}>
              <Music size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Club de Música</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{currentUser.nombre_completo}</span>
                {isAdmin && <Badge type="excelente">Administrador</Badge>}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isAdmin && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowInstrumentModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
              >
                <Plus size={18} />
                Nuevo Instrumento
              </motion.button>
            )}
            <motion.button 
              whileHover={{ backgroundColor: '#f1f5f9' }}
              onClick={handleLogout} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 500, transition: 'background-color 0.2s' }}
            >
              <LogOut size={16} />
              Salir
            </motion.button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT (Bento Grid) */}
      <main style={{ flex: 1, maxWidth: '1400px', margin: '0 auto', padding: '2rem', width: '100%' }}>
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', alignItems: 'start' }}
        >
          
          {/* CATALOGO DE INSTRUMENTOS */}
          <motion.section variants={fadeUp} style={{ background: 'white', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #f1f5f9', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.6rem', borderRadius: '12px', color: '#475569' }}><Tag size={20} /></div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Catálogo de Instrumentos</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {inventario.map(item => (
                <motion.div whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} key={item.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.2rem', transition: 'all 0.2s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>{item.nombre}</h3>
                    <Badge type={item.estado}>{item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}</Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Activity size={14} /> Tipo: {item.tipo}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={14} /> Ubic: {item.ubicacion}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* COLUMNA IZQ: RESERVAS DEL USUARIO (SI NO ES ADMIN) */}
          {!isAdmin && (
            <motion.section variants={fadeUp} style={{ background: 'white', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#f0fdf4', padding: '0.6rem', borderRadius: '12px', color: '#16a34a' }}><Calendar size={20} /></div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Mis Reservas</h2>
              </div>
              
              {userReservations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
                  <Calendar size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No tienes reservas agendadas.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {userReservations.map(res => (
                    <motion.div whileHover={{ scale: 1.01 }} key={res.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.2rem', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: res.estado === 'confirmada' ? '#22c55e' : '#eab308' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Reserva #{res.id}</span>
                        <Badge type={res.estado}>{res.estado.toUpperCase()}</Badge>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} color="#64748b" /> <strong>Inicia:</strong> {res.fecha_inicio}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} color="#64748b" /> <strong>Termina:</strong> {res.fecha_fin}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {/* AGREGAR SOCIO (SOLO ADMIN) */}
          {isAdmin && (
            <motion.section variants={fadeUp} style={{ background: 'white', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#ecfdf5', padding: '0.6rem', borderRadius: '12px', color: '#059669' }}><Plus size={20} /></div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Registrar Socio</h2>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Agrega un nuevo miembro al club</p>
                </div>
              </div>

              {socioMensaje.text && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '0.8rem 1rem', background: socioMensaje.type === 'success' ? '#dcfce7' : '#fee2e2', color: socioMensaje.type === 'success' ? '#166534' : '#991b1b', borderRadius: '12px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  {socioMensaje.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {socioMensaje.text}
                </motion.div>
              )}
              
              <form onSubmit={handleAgregarSocio}>
                <Input label="Nombre Completo" name="nombre_completo" value={socioForm.nombre_completo} onChange={(e) => setSocioForm({...socioForm, nombre_completo: e.target.value})} required placeholder="Ej. Ana Pérez" />
                <Input label="Correo Institucional" type="email" name="email_institucional" value={socioForm.email_institucional} onChange={(e) => setSocioForm({...socioForm, email_institucional: e.target.value})} required pattern=".*@pucesa\.edu\.ec$" title="Debe terminar en @pucesa.edu.ec" placeholder="ana@pucesa.edu.ec" />
                <Input label="Teléfono (WhatsApp)" name="telefono_whatsapp" value={socioForm.telefono_whatsapp} onChange={(e) => setSocioForm({...socioForm, telefono_whatsapp: e.target.value})} required placeholder="+593..." />
                <Input label="Instrumento Principal" name="instrumento_principal" value={socioForm.instrumento_principal} onChange={(e) => setSocioForm({...socioForm, instrumento_principal: e.target.value})} required placeholder="Piano, Guitarra, etc." />
                
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" style={{ width: '100%', padding: '0.9rem', background: '#059669', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, borderRadius: '12px', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                  Crear Socio
                </motion.button>
              </form>
            </motion.section>
          )}

          {/* FORMULARIO DE RESERVA */}
          <motion.section variants={fadeUp} style={{ background: 'white', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#eff6ff', padding: '0.6rem', borderRadius: '12px', color: '#2563eb' }}><Calendar size={20} /></div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{isAdmin ? 'Agendar Reserva' : 'Nueva Reserva'}</h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Confirmación instantánea vía WhatsApp</p>
              </div>
            </div>

            {mensaje.text && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '0.8rem 1rem', background: mensaje.type === 'success' ? '#dcfce7' : '#fee2e2', color: mensaje.type === 'success' ? '#166534' : '#991b1b', borderRadius: '12px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                {mensaje.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {mensaje.text}
              </motion.div>
            )}
            
            <form onSubmit={handleReservar}>
              {isAdmin && (
                <Select label="Socio" value={reservaForm.user_id} onChange={(e) => setReservaForm({...reservaForm, user_id: e.target.value})} required>
                  <option value="" disabled>Seleccione un socio...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.nombre_completo}</option>
                  ))}
                </Select>
              )}

              <Input label="Fecha de Inicio" type="datetime-local" value={reservaForm.fecha_inicio} onChange={(e) => setReservaForm({...reservaForm, fecha_inicio: e.target.value})} required />
              <Input label="Fecha de Fin" type="datetime-local" value={reservaForm.fecha_fin} onChange={(e) => setReservaForm({...reservaForm, fecha_fin: e.target.value})} required />

              <motion.button 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }} 
                type="submit" 
                disabled={isLoading}
                style={{ width: '100%', padding: '0.9rem', background: '#0f172a', color: 'white', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600, borderRadius: '12px', fontSize: '0.95rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
              >
                {isLoading ? <div className="spinner" style={{ border: '2px solid transparent', borderTopColor: 'white', borderRadius: '50%', width: '18px', height: '18px' }} /> : 'Confirmar Reserva'}
              </motion.button>
            </form>
          </motion.section>

        </motion.div>
      </main>

      {/* MODAL: AGREGAR INSTRUMENTO */}
      <AnimatePresence>
        {showInstrumentModal && (
          <>
            <motion.div 
              variants={modalOverlay}
              initial="hidden" animate="visible" exit="hidden"
              onClick={() => setShowInstrumentModal(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 100 }} 
            />
            <motion.div
              variants={modalSlide}
              initial="hidden" animate="visible" exit="exit"
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '450px', background: 'white', zIndex: 110, boxShadow: '-10px 0 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Music size={20} className="text-blue-600" /> Nuevo Instrumento</h2>
                <button onClick={() => setShowInstrumentModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.5rem', borderRadius: '50%', display: 'flex' }} className="hover:bg-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                <form onSubmit={handleAgregarInstrumento} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <Input label="Nombre del Instrumento" value={instrumentoForm.nombre} onChange={e => setInstrumentoForm({...instrumentoForm, nombre: e.target.value})} required placeholder="Ej. Fender Stratocaster" />
                  
                  <Select label="Tipo" value={instrumentoForm.tipo} onChange={e => setInstrumentoForm({...instrumentoForm, tipo: e.target.value})} required>
                    <option value="Guitarra">Guitarra</option>
                    <option value="Bajo">Bajo</option>
                    <option value="Batería">Batería</option>
                    <option value="Teclado">Teclado</option>
                    <option value="Amplificador">Amplificador</option>
                    <option value="Otro">Otro</option>
                  </Select>

                  <Select label="Estado Físico" value={instrumentoForm.estado} onChange={e => setInstrumentoForm({...instrumentoForm, estado: e.target.value})} required>
                    <option value="excelente">Excelente</option>
                    <option value="bueno">Bueno</option>
                    <option value="regular">Regular</option>
                    <option value="dañado">Dañado</option>
                    <option value="en_mantenimiento">En Mantenimiento</option>
                  </Select>

                  <Input label="Ubicación / Sala" value={instrumentoForm.ubicacion} onChange={e => setInstrumentoForm({...instrumentoForm, ubicacion: e.target.value})} required placeholder="Ej. Sala Acústica 1" />

                  <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                    <motion.button whileHover={{ backgroundColor: '#f1f5f9' }} type="button" onClick={() => setShowInstrumentModal(false)} style={{ flex: 1, padding: '0.9rem', background: 'transparent', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 600, borderRadius: '12px', fontSize: '0.95rem' }}>
                      Cancelar
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" style={{ flex: 1, padding: '0.9rem', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, borderRadius: '12px', fontSize: '0.95rem', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}>
                      Guardar
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
