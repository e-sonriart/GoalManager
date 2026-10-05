import { Equipo } from '../types';

// Equipos a cargo de un entrenador: lista "entrenadores" del equipo o columna antigua "entrenador"
export const equiposDelEntrenador = (equipos: Equipo[], nombreEntrenador: string): Equipo[] => {
  const clave = (nombreEntrenador || '').trim().toLowerCase();
  if (!clave) return [];
  return equipos.filter(e => {
    const lista =
      e.entrenadores && e.entrenadores.length
        ? e.entrenadores
        : e.entrenador
        ? e.entrenador.split(',').map(s => s.trim())
        : [];
    return lista.some(n => (n || '').trim().toLowerCase() === clave);
  });
};
