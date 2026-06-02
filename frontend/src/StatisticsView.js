import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function StatisticsView({ api }) {
  const [data, setData] = useState({ by_type: [], by_instrument: [] });
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('type'); // 'type' or 'instrument'

  useEffect(() => {
    let mounted = true;
    api('/statistics/loans').then((res) => {
      if (mounted) {
        setData(res);
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [api]);

  const currentData = groupBy === 'type' ? data.by_type : data.by_instrument;

  if (loading) {
    return <div className="panel"><p>Cargando estadísticas...</p></div>;
  }

  return (
    <div className="stack">
      <section className="panel wide">
        <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} />
            <h2>Instrumentos Más Prestados</h2>
          </div>
          <select 
            className="input" 
            style={{ width: 'auto' }}
            value={groupBy} 
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="type">Agrupar por Tipo</option>
            <option value="instrument">Agrupar por Instrumento</option>
          </select>
        </div>

        {currentData && currentData.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '1rem' }}>
            
            <div style={{ flex: '1 1 400px', height: '400px' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Proporción (Pastel)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {currentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: '1 1 400px', height: '400px' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Concurrencia (Barras)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {currentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        ) : (
          <p style={{ marginTop: '1rem', color: 'gray' }}>No hay datos de préstamos para mostrar.</p>
        )}
      </section>
    </div>
  );
}
