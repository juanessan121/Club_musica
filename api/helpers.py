"""Funciones utilitarias puras del sistema Club de Música."""
from datetime import datetime


def normalize_level(value):
    """Normaliza el nivel de habilidad al set permitido.

    >>> normalize_level('principiante')
    'PRINCIPIANTE'
    >>> normalize_level('AVANZADO')
    'AVANZADO'
    >>> normalize_level('desconocido')
    'PRINCIPIANTE'
    >>> normalize_level(None)
    'PRINCIPIANTE'
    >>> normalize_level('')
    'PRINCIPIANTE'
    """
    allowed = {"PRINCIPIANTE", "INTERMEDIO", "AVANZADO", "PROFESIONAL"}
    normalized = str(value or "PRINCIPIANTE").upper()
    return normalized if normalized in allowed else "PRINCIPIANTE"


def normalize_role(value):
    """Normaliza el rol: 'ADMIN' (insensible a mayúsculas) o 'SOCIO'.

    >>> normalize_role('ADMIN')
    'ADMIN'
    >>> normalize_role('admin')
    'ADMIN'
    >>> normalize_role('SOCIO')
    'SOCIO'
    >>> normalize_role(None)
    'SOCIO'
    """
    return "ADMIN" if str(value or "").upper() == "ADMIN" else "SOCIO"


def normalize_socio_estado(value):
    """Normaliza el estado del socio; SUSPENDIDO se mapea a INACTIVO.

    >>> normalize_socio_estado('ACTIVO')
    'ACTIVO'
    >>> normalize_socio_estado('BLOQUEADO')
    'BLOQUEADO'
    >>> normalize_socio_estado('SUSPENDIDO')
    'INACTIVO'
    >>> normalize_socio_estado(None)
    'ACTIVO'
    >>> normalize_socio_estado('invalido')
    'ACTIVO'
    """
    allowed = {"ACTIVO", "BLOQUEADO", "INACTIVO"}
    normalized = str(value or "ACTIVO").upper()
    if normalized == "SUSPENDIDO":
        normalized = "INACTIVO"
    return normalized if normalized in allowed else "ACTIVO"


def is_valid_operating_date(dt):
    """Fecha hábil: lunes–viernes a cualquier hora, sábado antes de las 12:00.

    >>> is_valid_operating_date(datetime(2026, 6, 22, 10, 0))  # Lunes
    True
    >>> is_valid_operating_date(datetime(2026, 6, 27, 11, 0))  # Sábado 11:00
    True
    >>> is_valid_operating_date(datetime(2026, 6, 27, 12, 0))  # Sábado 12:00
    False
    >>> is_valid_operating_date(datetime(2026, 6, 28, 9, 0))   # Domingo
    False
    """
    weekday = dt.weekday()  # 0=Lun … 5=Sáb, 6=Dom
    if weekday == 6:
        return False
    if weekday == 5 and dt.hour >= 12:
        return False
    return True


def require_fields(data, fields):
    """Mensaje de error si faltan campos en data; None si todos presentes.

    >>> require_fields({'nombre': 'test', 'email': 'a@b.com'}, ['nombre', 'email'])
    >>> require_fields({'nombre': 'test'}, ['nombre', 'email'])
    'Campos requeridos: email'
    >>> require_fields({}, ['a', 'b'])
    'Campos requeridos: a, b'
    >>> require_fields({'key': ''}, ['key'])
    'Campos requeridos: key'
    """
    missing = [field for field in fields if data.get(field) in (None, "")]
    if missing:
        return f"Campos requeridos: {', '.join(missing)}"
    return None
