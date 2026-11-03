import React from 'react';
import { Flag, Timer } from 'lucide-react';
import { Modal } from './Modal';
import { HighlightIcon } from './MatchHighlights';
import type { Partido } from '../types';
import type { MatchEvent } from '../utils/matchClock';
import { resumenDePartido, shortLabel } from '../utils/matchHighlights';

interface ResumenPartidoModalProps {
  isOpen: boolean;
  partido: Partido | null;
  events: MatchEvent[];
  onClose: () => void;
}

/** Fecha corta del partido (día de la semana + día + mes) */
const fechaCorta = (fecha: string): string => {
  const d = new Date(`${(fecha || '').slice(0, 10)}T12:00:00`);
  return !isNaN(d.getTime())
    ? d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    : fecha;
};

const tieneResultado = (partido: Partido): boolean =>
  partido.golesLocal !== '' && partido.golesLocal !== undefined && partido.golesLocal !== null;

/**
 * Modal con el resumen completo del partido: horas de inicio y fin de cada
 * parte, goles y tarjetas en orden cronológico y la asistencia debajo de cada
 * gol de nuestro equipo.
 */
export const ResumenPartidoModal: React.FC<ResumenPartidoModalProps> = ({
  isOpen,
  partido,
  events,
  onClose
}) => {
  if (!partido) return null;
  const { fases, filas, horaInicio, horaFin } = resumenDePartido(events, partido);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resumen del partido"
      subtitle={`${partido.local} vs ${partido.visitante} · ${fechaCorta(partido.fecha)}`}
      maxWidth="max-w-lg"
    >
      <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
        {/* Resultado */}
        <div className="bg-gray-950 text-white rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 text-sm sm:text-base font-bold font-athletic truncate text-right">
            {partido.local}
          </span>
          <span className="shrink-0 text-2xl font-black font-athletic text-orange-400 tabular-nums tracking-wider">
            {tieneResultado(partido)
              ? `${partido.golesLocal} - ${partido.golesVisitante}`
              : 'VS'}
          </span>
          <span className="min-w-0 flex-1 text-sm sm:text-base font-bold font-athletic truncate">
            {partido.visitante}
          </span>
        </div>

        {/* Horas de inicio y fin */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
              <Flag className="w-3 h-3" /> Hora de inicio
            </p>
            <p className="text-xl font-black font-athletic text-emerald-900 tabular-nums">
              {horaInicio || '—'}
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-orange-700">
              <Timer className="w-3 h-3" /> Hora de fin
            </p>
            <p className="text-xl font-black font-athletic text-orange-900 tabular-nums">
              {horaFin || '—'}
            </p>
          </div>
        </div>

        {/* Inicio/fin de cada parte (si el reloj los registró) */}
        {fases.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
              Inicio y fin de cada parte
            </p>
            <ul className="space-y-1">
              {fases.map(fase => (
                <li key={fase.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="min-w-0 truncate font-semibold text-gray-700">{fase.texto}</span>
                  <span className="shrink-0 font-black tabular-nums text-gray-900">{fase.hora}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Goles y tarjetas, con la asistencia debajo de cada gol */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
            Goles y tarjetas
          </p>
          {filas.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No hay eventos registrados de este partido.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-150 rounded-2xl overflow-hidden">
              {filas.map(({ event, label, side, score, asistencia }) => (
                <li key={event.id} className="px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-9 shrink-0 text-right text-[11px] font-black tabular-nums text-orange-600">
                      {event.minuto}′
                    </span>
                    <HighlightIcon event={event} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-gray-800" title={label}>
                        {label}
                      </span>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        {event.tipo === 'gol_contra'
                          ? 'Gol del rival'
                          : side === 'local'
                            ? 'Local'
                            : 'Visitante'}
                        {event.extra ? ` · ${event.extra}` : ''}
                        {event.hora ? ` · ${event.hora}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-black tabular-nums text-emerald-700">
                      {score}
                    </span>
                  </div>
                  {asistencia && (
                    <p className="mt-1 pl-11 flex items-center gap-1.5 text-[11px] text-emerald-700">
                      <span className="font-black uppercase tracking-wider text-[9px] text-emerald-600">
                        Asistencia
                      </span>
                      <span className="min-w-0 truncate font-semibold" title={shortLabel(asistencia)}>
                        {shortLabel(asistencia)}
                      </span>
                      {asistencia.hora && (
                        <span className="shrink-0 tabular-nums text-emerald-600/80">{asistencia.hora}</span>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};
