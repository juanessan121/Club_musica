import { describe, it, expect } from 'vitest';
import {
  formatDate,
  isValidOperatingDate,
  _isOperatingDay,
  OPERATING_DATE_ERROR,
} from '../utils';

describe('formatDate', () => {
  it('retorna "Sin fecha" para valores vacíos', () => {
    expect(formatDate('')).toBe('Sin fecha');
    expect(formatDate(null)).toBe('Sin fecha');
    expect(formatDate(undefined)).toBe('Sin fecha');
  });

  it('retorna solo la fecha cuando la hora es 00:00', () => {
    expect(formatDate('2026-06-15T00:00')).toBe('2026-06-15');
  });

  it('retorna fecha y hora cuando la hora es distinta de 00:00', () => {
    expect(formatDate('2026-06-15T14:30')).toBe('2026-06-15 14:30');
  });

  it('maneja cadenas con espacio en lugar de T', () => {
    expect(formatDate('2026-06-15 09:45:00')).toBe('2026-06-15 09:45');
  });

  it('trunca segundos y microsegundos', () => {
    expect(formatDate('2026-06-15T08:00:00.000Z')).toBe('2026-06-15 08:00');
  });
});

describe('_isOperatingDay(day, hour)', () => {
  it('retorna false en domingo (day=0)', () => {
    expect(_isOperatingDay(0, 10)).toBe(false);
    expect(_isOperatingDay(0, 0)).toBe(false);
    expect(_isOperatingDay(0, 23)).toBe(false);
  });

  it('retorna false en sábado (day=6) a las 12:00 o después', () => {
    expect(_isOperatingDay(6, 12)).toBe(false);
    expect(_isOperatingDay(6, 18)).toBe(false);
    expect(_isOperatingDay(6, 23)).toBe(false);
  });

  it('retorna true en sábado antes de las 12:00', () => {
    expect(_isOperatingDay(6, 0)).toBe(true);
    expect(_isOperatingDay(6, 11)).toBe(true);
  });

  it('retorna true en cualquier día de semana sin importar la hora', () => {
    expect(_isOperatingDay(1, 0)).toBe(true);   // Lunes 00:00
    expect(_isOperatingDay(2, 23)).toBe(true);  // Martes 23:00
    expect(_isOperatingDay(5, 23)).toBe(true);  // Viernes 23:00
  });
});

describe('isValidOperatingDate', () => {
  it('retorna true para entrada vacía, null o undefined', () => {
    expect(isValidOperatingDate('')).toBe(true);
    expect(isValidOperatingDate(null)).toBe(true);
    expect(isValidOperatingDate(undefined)).toBe(true);
  });

  it('retorna false para domingo', () => {
    // 2026-06-28 es domingo
    expect(isValidOperatingDate('2026-06-28T10:00')).toBe(false);
  });

  it('retorna false para sábado a las 12:00 o después', () => {
    // 2026-06-27 es sábado
    expect(isValidOperatingDate('2026-06-27T12:00')).toBe(false);
    expect(isValidOperatingDate('2026-06-27T15:00')).toBe(false);
  });

  it('retorna true para sábado antes de las 12:00', () => {
    expect(isValidOperatingDate('2026-06-27T11:00')).toBe(true);
    expect(isValidOperatingDate('2026-06-27T08:00')).toBe(true);
  });

  it('fecha sola (sin hora) se evalúa como mediodía', () => {
    // 2026-06-22 es lunes → mediodía en día laboral → true
    expect(isValidOperatingDate('2026-06-22')).toBe(true);
    // 2026-06-28 es domingo → false
    expect(isValidOperatingDate('2026-06-28')).toBe(false);
  });

  it('retorna true para lunes, miércoles y viernes', () => {
    expect(isValidOperatingDate('2026-06-22T09:00')).toBe(true);  // Lunes
    expect(isValidOperatingDate('2026-06-24T14:00')).toBe(true);  // Miércoles
    expect(isValidOperatingDate('2026-06-26T17:00')).toBe(true);  // Viernes
  });
});

describe('OPERATING_DATE_ERROR', () => {
  it('es un string no vacío', () => {
    expect(typeof OPERATING_DATE_ERROR).toBe('string');
    expect(OPERATING_DATE_ERROR.length).toBeGreaterThan(10);
  });

  it('menciona domingo o sábado', () => {
    const lower = OPERATING_DATE_ERROR.toLowerCase();
    expect(lower.includes('domingo') || lower.includes('sábado') || lower.includes('sabado')).toBe(true);
  });
});
