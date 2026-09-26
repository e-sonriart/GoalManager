import React from 'react';
import { CircleDot } from 'lucide-react';
import type { MatchEvent } from '../utils/matchClock';
import { highlightRows } from '../utils/matchHighlights';

/** Icono de una acción del resumen (gol / gol en contra / tarjeta) */
export const HighlightIcon: React.FC<{ event: MatchEvent; className?: string }> = ({
  event,
  className = 'w-3.5 h-3.5 shrink-0'
}) => {
  if (event.tipo === 'gol') return <CircleDot className={`${className} text-emerald-500`} />;
  if (event.tipo === 'gol_contra') return <CircleDot className={`${className} text-red-500`} />;
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
  /** Partido para colocar cada acción en su bando (local / visitante) */
  partido?: { local?: string; visitante?: string; equipo?: string; condicion?: string };
}

/**
 * Resumen del partido bajo el resultado: una línea por acción (solo goles y
 * tarjetas) en orden cronológico. El autor va a su lado —local a la
 * izquierda, visitante a la derecha— y el resultado siempre centrado en la
 * línea.
 */
export const MatchHighlights: React.FC<MatchHighlightsProps> = ({
  events,
  tone = 'dark',
  standalone = false,
  partido
}) => {
  const rows = highlightRows(events, partido);
  if (rows.length === 0) return null;
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
        Resumen del partido
      </p>
      <ul className="space-y-1">
        {rows.map(row => {
          const isLocal = row.side === 'local';
          const { event: e } = row;
          return (
            <li
              key={e.id}
              className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0 text-[11px] leading-tight ${
                dark ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                {isLocal && (
                  <>
                    <span
                      className={`w-9 shrink-0 text-right font-black tabular-nums ${
                        dark ? 'text-orange-300' : 'text-orange-600'
                      }`}
                    >
                      {e.minuto}′
                    </span>
                    <HighlightIcon event={e} />
                    <span className="truncate min-w-0 font-medium" title={e.texto}>
                      {row.label}
                    </span>
                  </>
                )}
              </span>
              <span
                className={`w-11 shrink-0 text-center font-black tabular-nums text-[11px] px-1 rounded ${
                  dark ? 'bg-white/10 text-emerald-300' : 'bg-gray-100 text-emerald-700'
                }`}
                title={e.tipo === 'gol' || e.tipo === 'gol_contra' ? 'Resultado tras el gol' : 'Marcador vigente'}
              >
                {row.score}
              </span>
              <span className="flex items-center gap-1.5 min-w-0 justify-end">
                {!isLocal && (
                  <>
                    <span className="truncate min-w-0 font-medium" title={e.texto}>
                      {row.label}
                    </span>
                    <HighlightIcon event={e} />
                    <span
                      className={`w-9 shrink-0 text-left font-black tabular-nums ${
                        dark ? 'text-orange-300' : 'text-orange-600'
                      }`}
                    >
                      {e.minuto}′
                    </span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
