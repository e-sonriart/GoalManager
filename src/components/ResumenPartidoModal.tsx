import React, { useEffect, useRef, useState } from 'react';
import { Download, Flag, Loader2, Timer } from 'lucide-react';
import { Modal } from './Modal';
import { HighlightIcon } from './MatchHighlights';
import { WhatsAppIcon } from './WhatsAppIcon';
import { useClub } from '../context/ClubContext';
import { resolveVisitorShield } from '../utils/shieldPresets';
import {
  compartirImagen,
  crearImagenResumenPartido,
  descargarImagen,
  nombreArchivoImagen
} from '../utils/partidoImagen';
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
  const { equipos, getTeamEscudo, clubConfig } = useClub();
  const [generando, setGenerando] = useState(false);
  const [imagen, setImagen] = useState<{ blob: Blob; url: string; nombre: string } | null>(null);
  const [aviso, setAviso] = useState('');
  const urlRef = useRef<string | null>(null);

  const liberarImagen = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setImagen(null);
    setAviso('');
  };

  // Al cerrar el modal o cambiar de partido se descarta la imagen generada.
  useEffect(() => {
    if (!isOpen) liberarImagen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    liberarImagen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partido?.id]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  if (!partido) return null;
  const { fases, filas, horaInicio, horaFin } = resumenDePartido(events, partido);

  const clubTeam =
    partido.equipo ||
    (equipos.some(e => e.nombre === partido.local) ? partido.local : partido.visitante);
  const escudoLocal =
    partido.local === clubTeam ? getTeamEscudo(partido.local) : resolveVisitorShield(partido);
  const escudoVisitante =
    partido.visitante === clubTeam ? getTeamEscudo(partido.visitante) : resolveVisitorShield(partido);

  const generarImagen = async () => {
    if (generando) return;
    setGenerando(true);
    setAviso('');
    try {
      const tieneMarcador = tieneResultado(partido);
      const golesClub = events.filter(e => e.tipo === 'gol').length;
      const golesRival = events.filter(e => e.tipo === 'gol_contra').length;
      const esClubLocal = partido.local === clubTeam;
      const golesLocal = tieneMarcador
        ? Number(partido.golesLocal) || 0
        : events.length > 0
          ? esClubLocal
            ? golesClub
            : golesRival
          : undefined;
      const golesVisitante = tieneMarcador
        ? Number(partido.golesVisitante) || 0
        : events.length > 0
          ? esClubLocal
            ? golesRival
            : golesClub
          : undefined;

      const blob = await crearImagenResumenPartido(partido, {
        escudoLocal,
        escudoVisitante,
        golesLocal,
        golesVisitante,
        clubName: clubConfig?.nombre,
        temporada: clubConfig?.temporada
      });

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setImagen({ blob, url, nombre: nombreArchivoImagen(partido) });
      setAviso('Imagen creada. Compártela o descárgala para enviarla por WhatsApp.');
    } catch (error) {
      console.error('[imagen resumen partido]', error);
      setAviso('No se pudo crear la imagen. Inténtalo de nuevo.');
    } finally {
      setGenerando(false);
    }
  };

  const compartir = async () => {
    if (!imagen) return;
    try {
      const resultado = await compartirImagen(imagen.blob, imagen.nombre);
      setAviso(
        resultado === 'compartida'
          ? 'Imagen compartida.'
          : 'Imagen descargada. Adjúntala en WhatsApp.'
      );
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;
      descargarImagen(imagen.blob, imagen.nombre);
      setAviso('Imagen descargada. Adjúntala en WhatsApp.');
    }
  };

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

        {/* Imagen para WhatsApp: fecha y hora, escudos y resultado */}
        <div className="rounded-2xl border border-gray-150 bg-gray-50 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Imagen para WhatsApp
              </p>
              <p className="text-[11px] text-gray-500">
                Fecha y hora, escudos en grande y resultado.
              </p>
            </div>
            <button
              type="button"
              onClick={generarImagen}
              disabled={generando}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {generando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <WhatsAppIcon className="w-4 h-4" />
              )}
              {generando ? 'Creando…' : imagen ? 'Regenerar' : 'Crear imagen'}
            </button>
          </div>

          {imagen && (
            <div className="space-y-2">
              <img
                src={imagen.url}
                alt={`Resumen de ${partido.local} contra ${partido.visitante}`}
                className="w-full rounded-xl border border-gray-200 shadow-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={compartir}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  Compartir
                </button>
                <button
                  type="button"
                  onClick={() => descargarImagen(imagen.blob, imagen.nombre)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
              </div>
            </div>
          )}

          {aviso && <p className="text-[11px] text-gray-500">{aviso}</p>}
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
