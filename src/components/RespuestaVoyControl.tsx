import type { FC } from 'react';
import { Check, X } from 'lucide-react';
import type { EstadoRespuestaSesion } from '../types';

interface RespuestaVoyControlProps {
  estado: string;
  onChange: (estado: EstadoRespuestaSesion | null) => void;
  disabled?: boolean;
}

export const RespuestaVoyControl: FC<RespuestaVoyControlProps> = ({ estado, onChange, disabled = false }) => {
  const activoSi = estado === 'si';
  const activoNo = estado === 'no';
  const base =
    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        disabled={disabled}
        title={activoSi ? 'Quitar marca (sin respuesta)' : 'Marcar que va (por el jugador)'}
        onClick={() => onChange(activoSi ? null : 'si')}
        className={`${base} ${
          activoSi
            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
            : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50'
        }`}
      >
        <Check className="w-3.5 h-3.5" />
        Va
      </button>
      <button
        type="button"
        disabled={disabled}
        title={activoNo ? 'Quitar marca (sin respuesta)' : 'Marcar que no va (por el jugador)'}
        onClick={() => onChange(activoNo ? null : 'no')}
        className={`${base} ${
          activoNo
            ? 'bg-red-500 border-red-500 text-white shadow-sm'
            : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
        }`}
      >
        <X className="w-3.5 h-3.5" />
        No va
      </button>
    </div>
  );
};
