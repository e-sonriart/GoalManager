import React from 'react';
import { CircleDot } from 'lucide-react';
import type { MatchEvent } from '../utils/matchClock';
import { highlightSides } from '../utils/matchHighlights';

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
  /** Partido para repartir las acciones por bando (local/visitante) */
  partido?: { local?: string; visitante?: string; equipo?: string; condicion?: string };
}

/**
 * Resumen del partido bajo el resultado: solo goles y tarjetas, en dos columnas
 * según el autor (equipo local o visitante). Cada gol muestra el marcador que
 * ha supuesto.
 */
export const MatchHighlights: React.FC<MatchHighlightsProps> = ({
  events,
  tone = 'dark',
  standalone = false,
  partido
}) => {
  const sides = highlightSides(events, partido);
  if (sides.local.length === 0 && sides.visitante.length === 0) return null;
  const dark = tone === 'dark';

  const columns: Array<{ label: string; rows: typeof sides.local }> = [
    { label: partido?.local || 'Local', rows: sides.local },
    { label: partido?.visitante || 'Visitante', rows: sides.visitante }
  ];

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
      <div className="grid grid-cols-2 gap-x-3">
        {columns.map(col => (
          <div key={col.label} className="min-w-0">
            <p
              className={`text-[9px] font-black uppercase tracking-wider mb-1 truncate ${
                dark ? 'text-gray-400' : 'text-gray-500'
              }`}
              title={col.label}
            >
              {col.label}
            </p>
            {col.rows.length === 0 ? (
              <p className={`text-[10px] font-medium ${dark ? 'text-gray-600' : 'text-gray-400'}`}>—</p>
            ) : (
              <ul className="space-y-1">
                {col.rows.map(({ event: e, score }) => (
                  <li
                    key={e.id}
                    className={`flex items-center gap-1.5 min-w-0 text-[11px] leading-tight ${
                      dark ? 'text-gray-200' : 'text-gray-700'
                    }`}
                  >
                    <span
                      className={`w-7 shrink-0 text-right font-black tabular-nums ${
                        dark ? 'text-orange-300' : 'text-orange-600'
                      }`}
                    >
                      {e.minuto}′
                    </span>
                    <HighlightIcon event={e} />
                    <span className="truncate flex-1 min-w-0 font-medium" title={e.texto}>
                      {e.texto}
                    </span>
                    {score && (
                      <span
                        className={`shrink-0 font-black tabular-nums text-[10px] px-1 rounded ${
                          dark ? 'bg-white/10 text-emerald-300' : 'bg-gray-100 text-emerald-700'
                        }`}
                        title="Resultado tras el gol"
                      >
                        {score}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
