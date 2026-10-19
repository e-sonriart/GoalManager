import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Ban, CalendarClock, Send } from 'lucide-react';

interface SuspenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Tipo de elemento, para los textos del modal */
  tipo: 'partido' | 'entrenamiento';
  /** Nombre corto del elemento (se muestra como subtítulo) */
  nombre: string;
  /** Valores actuales si se está reeditando la suspensión */
  motivoInicial?: string;
  hastaInicial?: string;
  onConfirm: (datos: { motivo: string; hasta: string }) => void;
}

/** Modal compartido: suspender un partido o un entrenamiento con mensaje */
export const SuspenderModal: React.FC<SuspenderModalProps> = ({
  isOpen,
  onClose,
  tipo,
  nombre,
  motivoInicial,
  hastaInicial,
  onConfirm
}) => {
  const [temporal, setTemporal] = useState(true);
  const [motivo, setMotivo] = useState('');
  const [hasta, setHasta] = useState('');
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const h = String(hastaInicial || '').trim();
    setHasta(h);
    setTemporal(Boolean(h));
    setMotivo(String(motivoInicial || '').trim());
    setTocado(false);
  }, [isOpen, motivoInicial, hastaInicial]);

  const motivoInvalido = motivo.trim().length < 3;
  const hastaInvalido = temporal && !hasta.trim();
  const valido = !motivoInvalido && !hastaInvalido;

  const handleSubmit = () => {
    if (!valido) {
      setTocado(true);
      return;
    }
    onConfirm({ motivo: motivo.trim(), hasta: temporal ? hasta.trim() : '' });
  };

  const etiqueta = tipo === 'partido' ? 'el partido' : 'la sesión';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Suspender ${tipo === 'partido' ? 'partido' : 'entrenamiento'}`}
      subtitle={nombre}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Tipo de suspensión */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTemporal(true)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
              temporal
                ? 'bg-amber-100 border-amber-400 text-amber-800'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CalendarClock className="w-4 h-4 shrink-0" />
            Temporal
          </button>
          <button
            type="button"
            onClick={() => setTemporal(false)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
              !temporal
                ? 'bg-red-100 border-red-400 text-red-800'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Ban className="w-4 h-4 shrink-0" />
            Definitivo
          </button>
        </div>

        <p className="text-[11px] text-gray-500 -mt-1">
          {temporal
            ? `Se reanuda solo cuando pase la fecha indicada: ${etiqueta} vuelve a la actividad programada sin tocar nada.`
            : `Se queda suspendido hasta que lo reactives manualmente.`}
        </p>

        {/* Reanudación (solo temporal) */}
        {temporal && (
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Reanudar el
            </label>
            <input
              type="datetime-local"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
            {tocado && hastaInvalido && (
              <p className="text-[11px] font-semibold text-red-600 mt-1">
                Indica la fecha y hora de reanudación
              </p>
            )}
          </div>
        )}

        {/* Motivo */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Motivo <span className="normal-case font-medium text-gray-400">(lo verá el equipo)</span>
          </label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={3}
            maxLength={240}
            placeholder={
              tipo === 'partido'
                ? 'Ej: El campo está inundado por la lluvia'
                : 'Ej: Sesión cancelada, el grupo está con grippe'
            }
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className="text-[11px] font-semibold text-red-600">
              {tocado && motivoInvalido ? 'Escribe un motivo de al menos 3 caracteres' : ''}
            </p>
            <p className="text-[10px] text-gray-400 shrink-0">{motivo.length}/240</p>
          </div>
        </div>

        {/* Aviso de notificación */}
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-[11px] text-amber-800">
          <Send className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Se enviará una notificación al equipo con este mensaje
            {temporal ? ' y la fecha de reanudación' : ''}.
          </span>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Ban className="w-3.5 h-3.5" />
            Suspender ahora
          </button>
        </div>
      </div>
    </Modal>
  );
};
