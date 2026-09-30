import { Partido } from '../types';

/** ¿Está el partido marcado como suspendido? (acepta boolean o string desde hojas) */
export const isPartidoSuspendido = (p?: Partial<Partido> | null): boolean => {
  const v = p?.suspendido;
  if (v === true) return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'si' || s === 'sí';
  }
  return false;
};
