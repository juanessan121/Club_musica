import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/api';

function App() {
  const [inventario, setInventario] = useState([]);
  const [users, setUsers] = useState([]);
  const [mensaje, setMensaje] = useState('');

  const [reservaForm, setReservaForm] = useState({
    user_id: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const invResponse = await fetch(`${API_URL}/inventario`);
      const invData = await invResponse.json();
      setInventario(invData);

      const userResponse = await fetch(`${API_URL}/users`);
      const userData = await userResponse.json();
      setUsers(userData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleInputChange = (e) => {
    setReservaForm({
      ...reservaForm,
      [e.target.name]: e.target.value
    });
  };

  const handleReservar = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/reservas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reservaForm)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMensaje(`Éxito: ${data.message}`);
        setReservaForm({ user_id: '', fecha_inicio: '', fecha_fin: '' });
      } else {
        setMensaje(`Error: ${data.error}`);
      }
    } catch (error) {
      setMensaje('Error de conexión con la API');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Club de Música - Panel de Gestión</h1>
      
      <section style={{ marginBottom: '2rem' }}>
        <h2>Catálogo de Instrumentos</h2>
        <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
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
                <td>{item.estado}</td>
                <td>{item.ubicacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Realizar Reserva de Sala (Envío a WhatsApp)</h2>
        {mensaje && <div style={{ padding: '1rem', background: '#eef', marginBottom: '1rem' }}>{mensaje}</div>}
        
        <form onSubmit={handleReservar} style={{ display: 'flex', flexDirection: 'column', maxWidth: '400px', gap: '1rem' }}>
          <label>
            Socio:
            <select name="user_id" value={reservaForm.user_id} onChange={handleInputChange} required style={{ width: '100%', padding: '0.5rem' }}>
              <option value="">Seleccione un socio...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.nombre_completo}</option>
              ))}
            </select>
          </label>

          <label>
            Fecha de Inicio (YYYY-MM-DD HH:MM:SS):
            <input type="datetime-local" name="fecha_inicio" value={reservaForm.fecha_inicio} onChange={handleInputChange} required style={{ width: '100%', padding: '0.5rem' }} />
          </label>

          <label>
            Fecha de Fin (YYYY-MM-DD HH:MM:SS):
            <input type="datetime-local" name="fecha_fin" value={reservaForm.fecha_fin} onChange={handleInputChange} required style={{ width: '100%', padding: '0.5rem' }} />
          </label>

          <button type="submit" style={{ padding: '1rem', background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}>
            Confirmar Reserva
          </button>
        </form>
      </section>
    </div>
  );
}

export default App;
