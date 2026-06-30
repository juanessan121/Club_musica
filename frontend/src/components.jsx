import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export function Badge({ value }) {
  const key = String(value || 'default').toLowerCase();
  return <span className={`badge badge-${key}`}>{value || 'N/D'}</span>;
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props) {
  return <input className="input" {...props} />;
}

export function SelectInput(props) {
  return <select className="input" {...props} />;
}

export function Message({ message }) {
  if (!message.text) return null;
  const Icon = message.type === 'success' ? CheckCircle2 : XCircle;
  return (
    <div className={`message ${message.type}`}>
      <Icon size={18} />
      <span>{message.text}</span>
    </div>
  );
}
