import { Partido } from '../types';

export interface TeamStanding {
  equipo: string;
  jugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  gf: number;
  gc: number;
  dif: number;
  puntos: number;
}

export interface CategoryStandings {
  categoria: string;
  rows: TeamStanding[];
}

const emptyRow = (equipo: string): TeamStanding => ({
  equipo,
  jugados: 0,
  ganados: 0,
  empatados: 0,
  perdidos: 0,
  gf: 0,
  gc: 0,
  dif: 0,
  puntos: 0
});

const toScore = (value: number | string | undefined): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const isFinalizado = (value: boolean | string | undefined): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', 'si', 'sí', 'final', 'finalizado', '1'].includes(value.trim().toLowerCase());
  }
  return false;
};

/**
 * Calcula la clasificación por categoría a partir de los partidos finalizados.
 * Incluye tanto los equipos del club como los rivales que aparecen en el calendario.
 */
export function computeStandings(partidos: Partido[]): CategoryStandings[] {
  const byCategory = new Map<string, Map<string, TeamStanding>>();

  partidos.forEach(partido => {
    if (!isFinalizado(partido.finalizado)) return;
    const gl = toScore(partido.golesLocal);
    const gv = toScore(partido.golesVisitante);
    if (gl === null || gv === null) return;

    const local = (partido.local || '').trim();
    const visitante = (partido.visitante || '').trim();
    if (!local || !visitante) return;

    const categoria = (partido.categoria || 'Sin categoría').trim() || 'Sin categoría';
    if (!byCategory.has(categoria)) byCategory.set(categoria, new Map());
    const table = byCategory.get(categoria)!;
    if (!table.has(local)) table.set(local, emptyRow(local));
    if (!table.has(visitante)) table.set(visitante, emptyRow(visitante));

    const home = table.get(local)!;
    const away = table.get(visitante)!;

    home.jugados += 1;
    away.jugados += 1;
    home.gf += gl;
    home.gc += gv;
    away.gf += gv;
    away.gc += gl;

    if (gl > gv) {
      home.ganados += 1;
      home.puntos += 3;
      away.perdidos += 1;
    } else if (gl < gv) {
      away.ganados += 1;
      away.puntos += 3;
      home.perdidos += 1;
    } else {
      home.empatados += 1;
      away.empatados += 1;
      home.puntos += 1;
      away.puntos += 1;
    }
  });

  const result: CategoryStandings[] = [];
  byCategory.forEach((table, categoria) => {
    const rows = Array.from(table.values())
      .map(row => ({ ...row, dif: row.gf - row.gc }))
      .sort(
        (a, b) =>
          b.puntos - a.puntos ||
          b.dif - a.dif ||
          b.gf - a.gf ||
          a.equipo.localeCompare(b.equipo)
      );
    result.push({ categoria, rows });
  });

  result.sort((a, b) => a.categoria.localeCompare(b.categoria));
  return result;
}
