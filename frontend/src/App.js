import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/api';

function App() {
  const [inventario, setInventario] = useState([]);
  const [users, setUsers] = useState([]);
  const [userReservations, setUserReservations] = useState([]);
  const [mensaje, setMensaje] = useState('');

  // Estado de sesión
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');

  const [reservaForm, setReservaForm] = useState({
    user_id: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  const [socioForm, setSocioForm] = useState({
    nombre_completo: '',
    email_institucional: '',
    telefono_whatsapp: '',
    instrumento_principal: ''
  });
  
  const [socioMensaje, setSocioMensaje] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchData();
      if (!isAdmin) {
        fetchUserReservations(currentUser.id);
        // Pre-seleccionar usuario actual en reservas para vista normal
        setReservaForm(prev => ({ ...prev, user_id: currentUser.id }));
      }
    }
  }, [currentUser, isAdmin]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
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
      setLoginError('Error de conexión con la API');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setLoginEmail('');
    setInventario([]);
    setUsers([]);
    setUserReservations([]);
    setMensaje('');
    setReservaForm({ user_id: '', fecha_inicio: '', fecha_fin: '' });
  };

  const fetchData = async () => {
    try {
      const invResponse = await fetch(`${API_URL}/inventario`);
      const invData = await invResponse.json();
      setInventario(invData);

      if (isAdmin) {
        const userResponse = await fetch(`${API_URL}/users`);
        const userData = await userResponse.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchUserReservations = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/reservas/${userId}`);
      const data = await response.json();
      setUserReservations(data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };

  const handleInputChange = (e) => {
    setReservaForm({
      ...reservaForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSocioInputChange = (e) => {
    setSocioForm({
      ...socioForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAgregarSocio = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(socioForm)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSocioMensaje(`Éxito: ${data.message}`);
        setSocioForm({
          nombre_completo: '',
          email_institucional: '',
          telefono_whatsapp: '',
          instrumento_principal: ''
        });
        fetchData(); // Recargar usuarios
      } else {
        setSocioMensaje(`Error: ${data.error}`);
      }
    } catch (error) {
      setSocioMensaje('Error de conexión con la API');
    }
  };

  const handleReservar = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservaForm)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMensaje(`Éxito: ${data.message}`);
        // Limpiar formulario parcialmente
        setReservaForm(prev => ({ 
          user_id: isAdmin ? '' : prev.user_id, 
          fecha_inicio: '', 
          fecha_fin: '' 
        }));
        
        // Actualizar reservas si es usuario normal
        if (!isAdmin) {
          fetchUserReservations(currentUser.id);
        }
      } else {
        setMensaje(`Error: ${data.error}`);
      }
    } catch (error) {
      setMensaje('Error de conexión con la API');
    }
  };

  // VISTA: LOGIN
  if (!currentUser) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
        <h2>🎸 Plataforma Club de Música</h2>
        <p>Inicia sesión con tu correo institucional.</p>
        <p style={{ fontSize: '0.85em', color: 'gray' }}>
          *Admin de prueba: juan.sandoval@pucesa.edu.ec <br/>
          *Usuario de prueba: javier.herrada@pucesa.edu.ec
        </p>
        
        {loginError && <div style={{ color: 'red', marginBottom: '1rem' }}>{loginError}</div>}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label>
            Correo Electrónico:
            <input 
              type="email" 
              value={loginEmail} 
              onChange={(e) => setLoginEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} 
              placeholder="nombre@pucesa.edu.ec"
            />
          </label>
          <button type="submit" style={{ padding: '0.8rem', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            Ingresar
          </button>
        </form>
      </div>
    );
  }

  // VISTA: AUTENTICADO (Admin o Usuario Normal)
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ccc', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Club de Música</h1>
          <span style={{ color: '#555' }}>
            Hola, <b>{currentUser.nombre_completo}</b> {isAdmin && <span style={{ background: '#dc2626', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8em', marginLeft: '0.5rem' }}>Administrador</span>}
          </span>
        </div>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
          Cerrar Sesión
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* COLUMNA IZQUIERDA */}
        <div>
          {/* CATALOGO */}
          <section style={{ marginBottom: '2rem' }}>
            <h2>Catálogo de Instrumentos</h2>
            <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead style={{ background: '#f3f4f6' }}>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {inventario.map(item => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{item.tipo}</td>
                    <td style={{ color: item.estado === 'excelente' ? 'green' : 'orange' }}>{item.estado}</td>
                    <td>{item.ubicacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* RESERVAS DEL USUARIO NORMAL */}
          {!isAdmin && (
             <section style={{ marginBottom: '2rem' }}>
             <h2>Mis Reservas</h2>
             {userReservations.length === 0 ? (
               <p>No tienes reservas agendadas.</p>
             ) : (
               <ul style={{ listStyle: 'none', padding: 0 }}>
                 {userReservations.map(res => (
                   <li key={res.id} style={{ padding: '1rem', border: '1px solid #ccc', marginBottom: '0.5rem', borderRadius: '4px' }}>
                     <strong>ID de Reserva:</strong> #{res.id} <br/>
                     <strong>Estado:</strong> {res.estado} <br/>
                     <strong>Inicia:</strong> {res.fecha_inicio} <br/>
                     <strong>Termina:</strong> {res.fecha_fin}
                   </li>
                 ))}
               </ul>
             )}
           </section>
          )}
        </div>

        {/* COLUMNA DERECHA */}
        <div>
          {/* FORMULARIO DE RESERVA */}
          <section style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h2>{isAdmin ? 'Agendar Reserva para un Socio' : 'Realizar mi Reserva'}</h2>
            <p style={{ fontSize: '0.9em', color: 'gray' }}>Recibirás una confirmación por WhatsApp.</p>

            {mensaje && (
              <div style={{ padding: '1rem', background: mensaje.includes('Éxito') ? '#dcfce7' : '#fee2e2', color: mensaje.includes('Éxito') ? '#166534' : '#991b1b', marginBottom: '1rem', borderRadius: '4px' }}>
                {mensaje}
              </div>
            )}
            
            <form onSubmit={handleReservar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isAdmin ? (
                <label>
                  Socio:
                  <select name="user_id" value={reservaForm.user_id} onChange={handleInputChange} required style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}>
                    <option value="">Seleccione un socio...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.nombre_completo} ({user.email_institucional})</option>
                    ))}
                  </select>
                </label>
              ) : (
                <input type="hidden" name="user_id" value={currentUser.id} />
              )}

              <label>
                Fecha de Inicio:
                <input type="datetime-local" name="fecha_inicio" value={reservaForm.fecha_inicio} onChange={handleInputChange} required style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }} />
              </label>

              <label>
                Fecha de Fin:
                <input type="datetime-local" name="fecha_fin" value={reservaForm.fecha_fin} onChange={handleInputChange} required style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }} />
              </label>

              <button type="submit" style={{ padding: '1rem', background: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px', marginTop: '0.5rem' }}>
                Confirmar Reserva
              </button>
            </form>
          </section>

          {/* FORMULARIO AGREGAR SOCIO (SOLO ADMIN) */}
          {isAdmin && (
            <section style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '2rem' }}>
              <h2>Agregar Nuevo Socio</h2>
              <p style={{ fontSize: '0.9em', color: 'gray' }}>Registra un nuevo miembro del club.</p>

              {socioMensaje && (
                <div style={{ padding: '1rem', background: socioMensaje.includes('Éxito') ? '#dcfce7' : '#fee2e2', color: socioMensaje.includes('Éxito') ? '#166534' : '#991b1b', marginBottom: '1rem', borderRadius: '4px' }}>
                  {socioMensaje}
                </div>
              )}
              
              <form onSubmit={handleAgregarSocio} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label>
                  Nombre Completo:
                  <input type="text" name="nombre_completo" value={socioForm.nombre_completo} onChange={handleSocioInputChange} required style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }} />
                </label>

                <label>
                  Correo Institucional (@pucesa.edu.ec):
                  <input type="email" name="email_institucional" value={socioForm.email_institucional} onChange={handleSocioInputChange} required pattern=".*@pucesa\.edu\.ec$" title="Debe terminar en @pucesa.edu.ec" placeholder="ejemplo@pucesa.edu.ec" style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }} />
                </label>

                <label>
                  Teléfono (WhatsApp, incluir código país):
                  <input type="text" name="telefono_whatsapp" value={socioForm.telefono_whatsapp} onChange={handleSocioInputChange} required placeholder="+593..." style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }} />
                </label>

                <label>
                  Instrumento Principal:
                  <input type="text" name="instrumento_principal" value={socioForm.instrumento_principal} onChange={handleSocioInputChange} required style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }} />
                </label>

                <button type="submit" style={{ padding: '1rem', background: '#059669', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px', marginTop: '0.5rem' }}>
                  Registrar Socio
                </button>
              </form>
            </section>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;
