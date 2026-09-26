import { Jugador } from '../types';

/** Quita acentos y espacios sobrantes. */
export const stripAccents = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const baseUsername = (j: Jugador): string => {
  const first = stripAccents((j.nombre || '').toLowerCase()).split(/\s+/)[0] || '';
  return first.replace(/[^a-z0-9]/g, '') || 'jugador';
};

const dorsalSuffix = (j: Jugador): string => {
  const d = String(j.dorsal ?? '').trim();
  return d ? `.${d}` : '';
};

/**
 * Usuario de acceso del jugador: nombre en minúsculas + '.' + dorsal (ej: sergio.21).
 * Si hay coincidencias añade un número correlativo antes del dorsal (sergio1.21, sergio2.21...).
 * El orden es estable (por id) para que no cambie según el orden de carga.
 */
export const getJugadorUsuario = (jugador: Jugador, all: Jugador[]): string => {
  const ordered = [...all].sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
  const used = new Set<string>();
  for (const p of ordered) {
    const base = baseUsername(p);
    const suffix = dorsalSuffix(p);
    let candidate = base + suffix;
    let n = 1;
    while (used.has(candidate)) {
      candidate = `${base}${n}${suffix}`;
      n++;
    }
    used.add(candidate);
    if (p.id === jugador.id) return candidate;
  }
  return baseUsername(jugador) + dorsalSuffix(jugador);
};
