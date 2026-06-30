import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, Field, Message, TextInput, SelectInput } from '../components';

describe('Badge', () => {
  it('muestra el valor dado', () => {
    render(<Badge value="ACTIVO" />);
    expect(screen.getByText('ACTIVO')).toBeInTheDocument();
  });

  it('muestra N/D cuando value es null o undefined', () => {
    render(<Badge value={null} />);
    expect(screen.getByText('N/D')).toBeInTheDocument();
  });

  it('aplica className con el value en minúsculas', () => {
    const { container } = render(<Badge value="DISPONIBLE" />);
    expect(container.firstChild).toHaveClass('badge-disponible');
  });

  it('aplica clase badge base siempre', () => {
    const { container } = render(<Badge value="ACTIVO" />);
    expect(container.firstChild).toHaveClass('badge');
  });
});

describe('Field', () => {
  it('muestra el label', () => {
    render(<Field label="Nombre completo"><input /></Field>);
    expect(screen.getByText('Nombre completo')).toBeInTheDocument();
  });

  it('renderiza los children', () => {
    render(<Field label="Email"><input placeholder="correo" /></Field>);
    expect(screen.getByPlaceholderText('correo')).toBeInTheDocument();
  });

  it('envuelve en un label', () => {
    const { container } = render(<Field label="X"><span /></Field>);
    expect(container.firstChild.tagName).toBe('LABEL');
  });
});

describe('Message', () => {
  it('no renderiza nada cuando message.text está vacío', () => {
    const { container } = render(<Message message={{ text: '', type: 'success' }} />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra el texto del mensaje de éxito', () => {
    render(<Message message={{ text: 'Operación exitosa', type: 'success' }} />);
    expect(screen.getByText('Operación exitosa')).toBeInTheDocument();
  });

  it('muestra el texto del mensaje de error', () => {
    render(<Message message={{ text: 'Algo salió mal', type: 'error' }} />);
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
  });

  it('aplica clase CSS según el type', () => {
    const { container } = render(<Message message={{ text: 'OK', type: 'success' }} />);
    expect(container.firstChild).toHaveClass('success');
  });

  it('aplica clase "error" para tipo error', () => {
    const { container } = render(<Message message={{ text: 'Error', type: 'error' }} />);
    expect(container.firstChild).toHaveClass('error');
  });
});

describe('TextInput', () => {
  it('renderiza un <input> con className "input"', () => {
    const { container } = render(<TextInput placeholder="texto" />);
    expect(container.firstChild.tagName).toBe('INPUT');
    expect(container.firstChild).toHaveClass('input');
  });

  it('propaga props adicionales', () => {
    render(<TextInput type="email" placeholder="correo@ejemplo.com" />);
    const input = screen.getByPlaceholderText('correo@ejemplo.com');
    expect(input.type).toBe('email');
  });
});

describe('SelectInput', () => {
  it('renderiza un <select> con className "input"', () => {
    const { container } = render(<SelectInput />);
    expect(container.firstChild.tagName).toBe('SELECT');
    expect(container.firstChild).toHaveClass('input');
  });

  it('renderiza opciones como children', () => {
    render(
      <SelectInput>
        <option value="A">Opción A</option>
        <option value="B">Opción B</option>
      </SelectInput>
    );
    expect(screen.getByText('Opción A')).toBeInTheDocument();
    expect(screen.getByText('Opción B')).toBeInTheDocument();
  });
});
