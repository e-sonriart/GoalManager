import React from 'react';
import { Ban, CalendarClock } from 'lucide-react';
import { SuspensionInfo } from '../utils/partidoEstado';

/** '24/10' con solo fecha; '24/10 · 17:00' si trae hora */
export const textoHasta = (hasta: string): string => {
  const raw = String(hasta || '').trim();
  if (!raw) return '';
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const d = new Date(soloFecha ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(d.getTime())) return raw;
  const fecha = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  if (soloFecha) return fecha;
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${fecha} · ${hora}`;
};

/** Píldora compacta de estado: "Suspendido · hasta 24/10 · 17:00" */
export const SuspensionBadge: React.FC<{ info: SuspensionInfo }> = ({ info }) => (
  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-red-600 border border-red-700 px-2 py-0.5 rounded-full shrink-0">
    <Ban className="w-3 h-3" />
    Suspendido{info.temporal && info.hasta ? ` · hasta ${textoHasta(info.hasta)}` : ''}
  </span>
);

/** Banner con el motivo para la tarjeta (partidos y entrenamientos) */
export const SuspensionBanner: React.FC<{ info: SuspensionInfo }> = ({ info }) => (
  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-red-800">
    <Ban className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
    <div className="text-xs min-w-0">
      <p className="font-bold flex items-center gap-1">
        {info.temporal && info.hasta ? (
          <>
            <CalendarClock className="w-3.5 h-3.5" />
            Suspendido hasta {textoHasta(info.hasta)}
          </>
        ) : (
          'Suspendido'
        )}
      </p>
      {info.motivo && <p className="text-red-700 mt-0.5 break-words">{info.motivo}</p>}
    </div>
  </div>
);
