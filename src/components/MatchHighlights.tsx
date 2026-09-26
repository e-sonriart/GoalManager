import React from 'react';
import { CircleDot, Handshake } from 'lucide-react';
import type { MatchEvent } from '../utils/matchClock';
import { highlightEvents } from '../utils/matchHighlights';

/** Icono de una acción destacada (gol ⚽, asistencia, tarjeta amarilla/roja) */
export const HighlightIcon: React.FC<{ event: MatchEvent; className?: string }> = ({
  event,
  className = 'w-3.5 h-3.5 shrink-0'
}) => {
  if (event.tipo === 'gol') return <CircleDot className={`${className} text-emerald-500`} />;
  if (event.tipo === 'gol_contra') return <CircleDot className={`${className} text-red-500`} />;
  if (event.tipo === 'asistencia') return <Handshake className={`${className} text-sky-500`} />;
  const roja = event.extra === 'roja' || /\broja\b/i.test(event.texto);
  return (
    <span
      className={`w-2.5 h-3.5 rounded-[2px] shrink-0 ${roja ? 'bg-red-500' : 'bg-amber-400'}`}
      title={roja ? 'Tarjeta roja' : 'Tarjeta amarilla'}
    />
  );
};

interface MatchHighlightsProps {
  events: MatchEvent[];
  tone?: 'dark' | 'light';
  /** true → tarjeta independiente (Partidos); false → franja pegada bajo un bloque oscuro */
  standalone?: boolean;
}

/**
 * Acciones destacadas (gol / gol en contra / asistencia / tarjeta) en orden
 * cronológico, para mostrar debajo del resultado.
 */
export const MatchHighlights: React.FC<MatchHighlightsProps> = ({
  events,
  tone = 'dark',
  standalone = false
}) => {
  const items = highlightEvents(events);
  if (items.length === 0) return null;
  const dark = tone === 'dark';

  return (
    <div
      className={
        standalone
          ? 'bg-black/40 border border-gray-800 rounded-2xl px-3 py-2.5'
          : `border-t ${dark ? 'bg-black/40 border-white/10 px-3.5 py-2.5' : 'bg-gray-50 border-gray-100 px-3.5 py-2.5'}`
      }
    >
      <p
        className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${
          dark ? 'text-orange-400' : 'text-gray-400'
        }`}
      >
        Acciones destacadas
      </p>
      <ul className="space-y-1">
        {items.map(e => (
          <li
            key={e.id}
            className={`flex items-center gap-2 min-w-0 text-[11px] leading-tight ${
              dark ? 'text-gray-200' : 'text-gray-700'
            }`}
          >
            <span
              className={`w-9 shrink-0 text-right font-black tabular-nums ${
                dark ? 'text-orange-300' : 'text-orange-600'
              }`}
            >
              {e.minuto}′
            </span>
            <HighlightIcon event={e} />
            <span className="truncate font-medium" title={e.texto}>
              {e.texto}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
