import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Send, Sparkles, Trash2 } from 'lucide-react';
import { useClub } from '../context/ClubContext';
import { sendNotify } from '../services/notifications';

interface FraseDelDiaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal del entrenador/admin: activar una frase motivadora para su equipo
 * (o para todo el club), quitarla y enviarla al equipo por notificación.
 */
export const FraseDelDiaModal: React.FC<FraseDelDiaModalProps> = ({ isOpen, onClose }) => {
  const {
    frases,
    equipos,
    equiposControlables,
    equipoFiltro,
    currentUser,
    activarFrase,
    quitarFrase,
    addToast
  } = useClub();

  const [equipoSel, setEquipoSel] = useState('');
  const [texto, setTexto] = useState('');
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [notificando, setNotificando] = useState(false);

  const esAdmin = currentUser?.rol === 'admin';

  const opciones = useMemo<string[]>(() => {
    const base = equiposControlables.length
      ? equiposControlables
      : equipos.map(e => e.nombre).filter(Boolean);
    return esAdmin ? ['', ...base] : base;
  }, [equiposControlables, equipos, esAdmin]);

  // Solo cuenta la frase fijada: las del banco (fija=false) rotan cada día y no se editan aquí
  const fraseGuardada = useMemo(
    () =>
      frases.find(
        f =>
          f.fija &&
          (f.equipo || '').trim().toLowerCase() === equipoSel.trim().toLowerCase()
      ) || null,
    [frases, equipoSel]
  );

  useEffect(() => {
    if (!isOpen) return;
    const inicial =
      equipoFiltro && opciones.includes(equipoFiltro) ? equipoFiltro : (opciones[0] ?? '');
    setEquipoSel(inicial);
    setTocado(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setTexto(fraseGuardada?.frase || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, equipoSel]);

  const etiqueta = equipoSel || 'todo el club';
  const textoInvalido = texto.trim().length < 3;
  const mismaQueGuardada =
    Boolean(fraseGuardada) && texto.trim() === (fraseGuardada?.frase || '').trim();

  const handleActivar = async () => {
    if (textoInvalido) {
      setTocado(true);
      return;
    }
    setGuardando(true);
    const categoriaEq = equipos.find(e => e.nombre.trim().toLowerCase() === equipoSel.trim().toLowerCase())?.categoria || '';
    const guardada = await activarFrase(equipoSel, texto.trim(), currentUser?.nombre || '', categoriaEq);
    setGuardando(false);
    if (guardada) setTocado(false);
  };

  const handleQuitar = async () => {
    if (!fraseGuardada) return;
    const ok = await quitarFrase(String(fraseGuardada.id));
    if (ok) setTexto('');
  };

  const handleNotificar = async () => {
    if (textoInvalido) {
      setTocado(true);
      return;
    }
    const destinos = equipoSel
      ? [equipoSel]
      : equipos.map(e => e.nombre).filter(Boolean);
    if (!destinos.length) {
      addToast({ type: 'error', title: 'Sin equipos', message: 'No hay equipos a los que enviar la frase.' });
      return;
    }
    setNotificando(true);
    try {
      const frase = texto.trim();
      const refId = `frase_${Date.now()}`;
      let total = 0;
      for (const eq of destinos) {
        const res = await sendNotify({
          tipo: 'frase_dia',
          equipo: eq,
          refId,
          titulo: 'FRASE DEL DIA',
          cuerpo: frase,
          url: '/'
        });
        total += res.notified;
      }
      addToast({
        type: 'success',
        title: 'Frase enviada',
        message: total
          ? `Notificada a ${total} ${total === 1 ? 'persona' : 'personas'}.`
          : 'Guardada: no había dispositivos suscritos.'
      });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo enviar la notificación.' });
    } finally {
      setNotificando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Frase del día"
      subtitle={esAdmin ? `Destino: ${etiqueta}` : `Equipo: ${etiqueta}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Equipo destino */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Equipo
          </label>
          <select
            value={equipoSel}
            onChange={e => setEquipoSel(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            {opciones.map(op => (
              <option key={op || 'club'} value={op}>
                {op || 'Todo el club'}
              </option>
            ))}
          </select>
        </div>

        {/* Frase */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Frase <span className="normal-case font-medium text-gray-400">(lo verá el equipo)</span>
          </label>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={3}
            maxLength={240}
            placeholder="Ej: El esfuerzo de hoy es el éxito de mañana"
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className="text-[11px] font-semibold text-red-600">
              {tocado && textoInvalido ? 'Escribe una frase de al menos 3 caracteres' : ''}
            </p>
            <p className="text-[10px] text-gray-400 shrink-0">{texto.length}/240</p>
          </div>
        </div>

        {/* Frase ya activa para ese equipo */}
        {fraseGuardada && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-[11px] text-gray-600">
            <span className="min-w-0 truncate">
              Frase fijada{fraseGuardada.creadaPor ? ` · ${fraseGuardada.creadaPor}` : ''}
            </span>
            <button
              type="button"
              onClick={handleQuitar}
              className="shrink-0 inline-flex items-center gap-1 font-bold text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Quitar
            </button>
          </div>
        )}

        {/* Aviso */}
        <div className="flex items-start gap-2 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2.5 text-[11px] text-orange-800">
          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Si no hay frase fijada, la tarjeta <strong>FRASE DEL DIA</strong> muestra cada día una
            frase al azar del banco y la cambia sola. «Fijar» la deja quieta hasta que la quites.
            Con «Notificar» se envía por push al equipo seleccionado.
          </span>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleNotificar}
            disabled={notificando || textoInvalido}
            className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            {notificando ? 'Enviando…' : 'Notificar al equipo'}
          </button>
          <button
            type="button"
            onClick={handleActivar}
            disabled={guardando || (mismaQueGuardada && !textoInvalido)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {guardando ? 'Guardando…' : 'Fijar'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
