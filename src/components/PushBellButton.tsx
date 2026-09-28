import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { useClub } from '../context/ClubContext';
import {
  disablePush,
  enablePush,
  getActiveSubscription,
  pushSupported,
  saveSubscription
} from '../services/notifications';

type BellState = 'cargando' | 'off' | 'on' | 'bloqueado' | 'no-soportado';

/**
 * Campana de avisos push: activa/desactiva Web Push para el usuario actual
 * (convocatorias, cambios de horario, resultados y recordatorios).
 */
export const PushBellButton: React.FC = () => {
  const { currentUser, addToast } = useClub();
  const [state, setState] = useState<BellState>('cargando');
  const userTipo = currentUser?.rol === 'jugador' ? 'jugador' : 'staff';

  const refresh = useCallback(async () => {
    if (!pushSupported()) {
      setState('no-soportado');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('bloqueado');
      return;
    }
    if (Notification.permission !== 'granted') {
      setState('off');
      return;
    }
    try {
      const sub = await getActiveSubscription();
      // Autoreparación: si el navegador está suscrito, asegura la fila en el servidor
      if (sub && currentUser?.id) {
        await saveSubscription(sub, userTipo, currentUser.id);
      }
      setState(sub ? 'on' : 'off');
    } catch {
      setState('off');
    }
  }, [currentUser?.id, userTipo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state === 'no-soportado') return null;

  const toggle = async () => {
    if (state === 'on') {
      try {
        await disablePush();
      } catch {
        /* best effort */
      }
      setState('off');
      addToast({
        type: 'info',
        title: 'Avisos desactivados',
        message: 'Este dispositivo ya no recibirá avisos push.'
      });
      return;
    }
    if (state === 'bloqueado') {
      addToast({
        type: 'error',
        title: 'Permiso de notificaciones bloqueado',
        message: 'Activa las notificaciones de este sitio en la configuración del navegador del dispositivo.'
      });
      return;
    }
    setState('cargando');
    const r = await enablePush(userTipo, currentUser?.id || '');
    if (r.ok) {
      setState('on');
      addToast({
        type: 'success',
        title: 'Avisos activados',
        message: 'Recibirás convocatorias, cambios y recordatorios en este dispositivo.'
      });
    } else if (r.reason === 'denied') {
      setState('bloqueado');
      addToast({
        type: 'error',
        title: 'Permiso denegado',
        message: 'El navegador bloqueó las notificaciones para este sitio.'
      });
    } else if (r.reason === 'no-user') {
      setState('off');
      addToast({
        type: 'error',
        title: 'Inicia sesión',
        message: 'Necesitas tener la sesión iniciada para activar los avisos.'
      });
    } else {
      setState('off');
      addToast({
        type: 'error',
        title: 'No se pudieron activar los avisos',
        message: r.message || 'Error desconocido.'
      });
    }
  };

  const on = state === 'on';
  const blocked = state === 'bloqueado';
  const title = on
    ? 'Avisos push activos (clic para desactivar)'
    : blocked
      ? 'Notificaciones bloqueadas en el navegador'
      : 'Activar avisos push (convocatorias, cambios y recordatorios)';

  return (
    <button
      onClick={() => void toggle()}
      disabled={state === 'cargando'}
      title={title}
      aria-label={title}
      className={`h-10 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-xl transition-colors shrink-0 border active:scale-95 disabled:opacity-60 ${
        on
          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50'
          : blocked
            ? 'bg-red-950/40 border-red-800/60 text-red-300 hover:bg-red-900/50'
            : 'border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800'
      }`}
    >
      {state === 'cargando' ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : on ? (
        <BellRing className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : blocked ? (
        <BellOff className="w-4 h-4 text-red-400 shrink-0" />
      ) : (
        <Bell className="w-4 h-4 shrink-0" />
      )}
      <span className="hidden xl:inline text-xs font-semibold">
        {on ? 'Avisos activos' : blocked ? 'Avisos off' : 'Avisos'}
      </span>
    </button>
  );
};
