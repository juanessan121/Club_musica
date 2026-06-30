export function formatDate(value) {
  if (!value) return 'Sin fecha';
  const s = value.replace('T', ' ').slice(0, 16);
  const [datePart, timePart] = s.split(' ');
  if (!timePart || timePart === '00:00') return datePart;
  return `${datePart} ${timePart}`;
}

// Exported for unit testing — not part of the public API.
export function _isOperatingDay(day, hour) {
  if (day === 0) return false;
  if (day === 6 && hour >= 12) return false;
  return true;
}

export function isWithinOperatingHours() {
  const now = new Date();
  return _isOperatingDay(now.getDay(), now.getHours());
}

export function isValidOperatingDate(dateStr) {
  if (!dateStr) return true;
  // datetime-local strings (YYYY-MM-DDTHH:MM) are parsed as local time — no UTC shift
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
  return _isOperatingDay(d.getDay(), d.getHours());
}

export const OPERATING_DATE_ERROR =
  'No se permiten reservas ni préstamos en domingo ni sábado a partir de las 12:00.';

export const OPERATING_DATE_WARNING_STYLE = {
  background: '#fef2f2',
  border: '1.5px solid #ef4444',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#b91c1c',
  fontSize: '0.82rem',
  fontWeight: 600,
  marginTop: '4px',
};
