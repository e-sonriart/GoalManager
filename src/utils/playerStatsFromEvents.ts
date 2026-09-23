import type { MatchEvent } from './matchClock';

export interface PlayerStatsDelta {
  jugadorId: string;
  goles: number;
  asistencias: number;
  tarjetas: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  partidosJugados: number;
  titular: number;
}

const emptyDelta = (jugadorId: string): PlayerStatsDelta => ({
  jugadorId,
  goles: 0,
  asistencias: 0,
  tarjetas: 0,
  tarjetasAmarillas: 0,
  tarjetasRojas: 0,
  partidosJugados: 0,
  titular: 0
});

/**
 * Agrega los eventos del reloj a deltas por jugador:
 * - titulares → partidosJugados + titular (solo si se pasan)
 * - goles / asistencias / tarjetas con jugadorId
 * - suplentes con evento (gol, asistencia, tarjeta, cambio) → partidosJugados
 */
export function aggregateEventStats(
  events: MatchEvent[],
  titulares: string[] = []
): PlayerStatsDelta[] {
  const map = new Map<string, PlayerStatsDelta>();
  const ensure = (id: string): PlayerStatsDelta => {
    let d = map.get(id);
    if (!d) {
      d = emptyDelta(id);
      map.set(id, d);
    }
    return d;
  };

  for (const id of titulares) {
    if (!id) continue;
    const d = ensure(id);
    d.partidosJugados += 1;
    d.titular += 1;
  }

  for (const e of events) {
    if (!e.jugadorId) continue;
    const d = ensure(e.jugadorId);
    const esParticipacion =
      e.tipo === 'gol' ||
      e.tipo === 'asistencia' ||
      e.tipo === 'tarjeta' ||
      e.tipo === 'cambio';

    if (esParticipacion && d.partidosJugados === 0 && d.titular === 0) {
      d.partidosJugados = 1;
    }

    if (e.tipo === 'gol') {
      d.goles += 1;
    } else if (e.tipo === 'asistencia') {
      d.asistencias += 1;
    } else if (e.tipo === 'tarjeta') {
      d.tarjetas += 1;
      if (e.extra === 'roja') d.tarjetasRojas += 1;
      else d.tarjetasAmarillas += 1;
    }
  }

  return Array.from(map.values());
}

/**
 * Deltas al guardar la convocatoria:
 * - quien entra → +1 partido jugado (si no es ya titular de este partido)
 * - quien sale → -1 partido jugado (si no es titular)
 * - un titular no suma partido otra vez por convocatoria (ya lo cuenta la alineación)
 */
export function convocatoriaStatsDeltas(
  prevConvocados: string[],
  nextConvocados: string[],
  titulares: string[] = []
): PlayerStatsDelta[] {
  const tit = new Set(titulares.filter(Boolean));
  const prev = new Set(prevConvocados.filter(Boolean));
  const next = new Set(nextConvocados.filter(Boolean));
  const deltas: PlayerStatsDelta[] = [];

  for (const id of next) {
    if (prev.has(id)) continue;
    if (tit.has(id)) continue;
    deltas.push({ ...emptyDelta(id), partidosJugados: 1 });
  }
  for (const id of prev) {
    if (next.has(id)) continue;
    if (tit.has(id)) continue;
    deltas.push({ ...emptyDelta(id), partidosJugados: -1 });
  }
  return deltas;
}

/**
 * Deltas al guardar la alineación titular:
 * - quien entra → +1 titular; +1 partido solo si aún no estaba convocado
 * - quien sale → revierte lo anterior
 */
export function titularesStatsDeltas(
  prevTitulares: string[],
  nextTitulares: string[],
  convocados: string[] = []
): PlayerStatsDelta[] {
  const conv = new Set(convocados.filter(Boolean));
  const prev = new Set(prevTitulares.filter(Boolean));
  const next = new Set(nextTitulares.filter(Boolean));
  const deltas: PlayerStatsDelta[] = [];

  for (const id of next) {
    if (prev.has(id)) continue;
    const d = { ...emptyDelta(id), titular: 1 };
    if (!conv.has(id)) d.partidosJugados = 1;
    deltas.push(d);
  }
  for (const id of prev) {
    if (next.has(id)) continue;
    const d = { ...emptyDelta(id), titular: -1 };
    if (!conv.has(id)) d.partidosJugados = -1;
    deltas.push(d);
  }
  return deltas;
}

export function scaleEventStatsDeltas(
  deltas: PlayerStatsDelta[],
  sign: 1 | -1
): PlayerStatsDelta[] {
  return deltas.map(d => ({
    ...d,
    goles: d.goles * sign,
    asistencias: d.asistencias * sign,
    tarjetas: d.tarjetas * sign,
    tarjetasAmarillas: d.tarjetasAmarillas * sign,
    tarjetasRojas: d.tarjetasRojas * sign,
    partidosJugados: d.partidosJugados * sign,
    titular: d.titular * sign
  }));
}
