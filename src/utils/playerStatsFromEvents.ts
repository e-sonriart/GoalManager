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
 * NOTA: para el acta usa actaStatsDeltas (evita dobles contados de partidos).
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
 * Deltas al confirmar el acta (el partido se cuenta SOLO cuando se juega):
 * - +1 partido jugado a cada convocado y titular (deduplicado)
 * - +1 titular a cada titular
 * - goles / asistencias / tarjetas de los eventos, SIN partidosJugados
 *   (evita el doble conteo: convocar o alinear ya no suma partidos)
 */
export function actaStatsDeltas(
  convocados: string[],
  titulares: string[],
  events: MatchEvent[]
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

  const conv = new Set(convocados.filter(Boolean));
  const tit = new Set(titulares.filter(Boolean));

  for (const id of new Set([...conv, ...tit])) {
    ensure(id).partidosJugados += 1;
  }
  for (const id of tit) {
    ensure(id).titular += 1;
  }

  for (const d of aggregateEventStats(events, [])) {
    const t = ensure(d.jugadorId);
    t.goles += d.goles;
    t.asistencias += d.asistencias;
    t.tarjetas += d.tarjetas;
    t.tarjetasAmarillas += d.tarjetasAmarillas;
    t.tarjetasRojas += d.tarjetasRojas;
  }

  return Array.from(map.values());
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
