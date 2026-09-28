/**
 * Web Push (PWA): permisos, suscripción en push_subscriptions y envío vía /api/push.
 * La clave privada VAPID vive solo en el servidor (api/push.ts).
 */

const VAPID_PUBLIC_KEY = 'BNcInaGqfcatxS3COU0Cw2g1XqcX1yOPwdBBPfVVnHkLydD0wPkaXKgspkaJrB4KqAYPy-dScdHoo9MA4iNWGIQ';

import { getSupabase } from './supabaseClient';

export interface NotifyPayload {
  /** nuevo | convocatoria | horario | resultado | recordatorio24 | recordatorio5 | recordatorio2 */
  tipo: string;
  equipo?: string;
  /** Clave de dedupe en notificaciones (mismo ref = no se repite) */
  refId?: string;
  /** Si se indican, solo esos jugadores (además del staff del equipo) */
  jugadorIds?: string[];
  titulo: string;
  cuerpo?: string;
  url?: string;
}

export interface NotifyResult {
  notified: number;
  sent: number;
}

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
};

export const pushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

/** Suscripción activa del navegador (la registra si falta) */
export const getActiveSubscription = async (): Promise<PushSubscription | null> => {
  if (!pushSupported()) return null;
  const reg =
    (await navigator.serviceWorker.getRegistration()) ||
    (await navigator.serviceWorker.register('/sw.js'));
  return reg.pushManager.getSubscription();
};

/** Persiste la suscripción asociada al usuario actual (upsert por endpoint) */
export const saveSubscription = async (
  sub: PushSubscription,
  userTipo: string,
  userId: string
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase no configurado');
  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: json.endpoint || '',
      p256dh: json.keys?.p256dh || '',
      auth: json.keys?.auth || '',
      user_tipo: userTipo,
      user_id: userId,
      user_agent: navigator.userAgent
    },
    { onConflict: 'endpoint' }
  );
  if (error) throw new Error(error.message || 'Error al guardar la suscripción');
};

export interface EnablePushResult {
  ok: boolean;
  reason?: 'denied' | 'unsupported' | 'no-user' | 'error';
  message?: string;
}

/** Pide permiso, suscribe y guarda. Llamar SIEMPRE desde un clic del usuario. */
export const enablePush = async (userTipo: string, userId: string): Promise<EnablePushResult> => {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  if (!userTipo || !userId) return { ok: false, reason: 'no-user' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: permission === 'denied' ? 'denied' : 'error', message: permission };
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    await saveSubscription(sub, userTipo, userId);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
  }
};

/** Borra la suscripción del servidor y la cancela en el navegador */
export const disablePush = async (): Promise<void> => {
  const sub = await getActiveSubscription();
  if (!sub) return;
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    if (error) console.warn('No se pudo borrar la suscripción del servidor:', error.message);
  }
  await sub.unsubscribe();
};

/** Envío síncrono (devuelve cuántos avisos se insertaron y a cuántos dispositivos llegó) */
export const sendNotify = async (payload: NotifyPayload): Promise<NotifyResult> => {
  const res = await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as NotifyResult;
};

/** Envío sin bloquear la UI (errores solo en consola) */
export const notifyTeam = (payload: NotifyPayload): void => {
  void sendNotify(payload).catch(err =>
    console.warn('No se pudo enviar la notificación push:', err)
  );
};
