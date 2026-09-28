/**
 * POST /api/push — envía notificaciones push (Web Push) a los objetivos de un equipo.
 *
 * Cuerpo JSON:
 *   { tipo, equipo?, refId?, jugadorIds?, titulo, cuerpo?, url? }
 *
 * Flujo: resuelve destinatarios (jugadores del equipo + staff) → registra el aviso en
 * la tabla `notificaciones` (los duplicados se ignoran: unique(user,tipo,ref)) →
 * envía el push a los dispositivos suscritos de esos destinatarios.
 */
import webpush from 'web-push';

const SUPABASE_URL = 'https://fycfljwckpflderfddgy.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y2Zsandja3BmbGRlcmZkZGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzE0MzMsImV4cCI6MjEwNTc0NzQzM30.PW75GFSrD7v0KgKWyhjaL6k_Po_OyJ5TTY-ABXXZdtM';
const VAPID_SUBJECT = 'mailto:admin@clubfutbol.com';
const VAPID_PUBLIC_KEY =
  'BNcInaGqfcatxS3COU0Cw2g1XqcX1yOPwdBBPfVVnHkLydD0wPkaXKgspkaJrB4KqAYPy-dScdHoo9MA4iNWGIQ';
const VAPID_PRIVATE_KEY = 'XsmgA-nGwddIMhspiF0hEhvoUHAYFtVeU2pu9LASGHM';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface PushBody {
  tipo?: string;
  equipo?: string;
  refId?: string;
  jugadorIds?: string[];
  titulo?: string;
  cuerpo?: string;
  url?: string;
}

interface Target {
  user_tipo: string;
  user_id: string;
}

const restHeaders: Record<string, string> = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

/** GET a la REST API de Supabase (sin RLS: mismo modelo que la app) */
export async function restGet(path: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: restHeaders });
  if (!r.ok) throw new Error(`Supabase ${path}: HTTP ${r.status}`);
  return (await r.json()) as any[];
}

/** Resuelve destinatarios: jugadores (convocados o del equipo) + staff (del equipo o global) */
function resolveTargets(jugadores: any[], usuarios: any[], equipo: string, jugadorIds: string[]): Map<string, Target> {
  const eq = (equipo || '').trim().toLowerCase();
  const targets = new Map<string, Target>();
  const add = (t: string, id: string) => {
    if (id) targets.set(`${t}:${id}`, { user_tipo: t, user_id: id });
  };

  if (jugadorIds.length) {
    for (const id of jugadorIds) add('jugador', id);
  } else {
    for (const j of jugadores) {
      if (eq && String(j.equipo || '').trim().toLowerCase() === eq) add('jugador', j.id);
    }
  }

  for (const u of usuarios) {
    const rol = String(u.rol || '').toLowerCase();
    const uEq = String(u.equipo || '').trim().toLowerCase();
    if (rol === 'jugador') {
      // Cuentas creadas en `usuarios` con rol jugador: se tratan como jugadores de su equipo
      if (eq && uEq === eq) add('jugador', u.id);
      continue;
    }
    // Staff de este equipo o staff sin equipo asignado (directiva/admin)
    if (!uEq || (eq && uEq === eq)) add('staff', u.id);
  }
  return targets;
}

/** Inserta historial (ignora duplicados) y envía el push a los dispositivos correspondientes */
export async function dispatchNotification(body: PushBody): Promise<{ notified: number; sent: number }> {
  const tipo = String(body?.tipo || '').trim();
  const titulo = String(body?.titulo || '').trim();
  if (!tipo || !titulo) throw new Error('Faltan "tipo" o "titulo"');
  const equipo = String(body?.equipo || '').trim();
  const refId = String(body?.refId || '').trim();
  const cuerpo = String(body?.cuerpo || '');
  const url = String(body?.url || '/') || '/';
  const jugadorIds: string[] = Array.isArray(body?.jugadorIds)
    ? body.jugadorIds.filter((v): v is string => typeof v === 'string' && !!v)
    : [];

  const [jugadores, usuarios, subs] = await Promise.all([
    restGet('jugadores?select=id,equipo'),
    restGet('usuarios?select=id,equipo,rol'),
    restGet('push_subscriptions?select=endpoint,p256dh,auth,user_tipo,user_id')
  ]);

  const targets = resolveTargets(jugadores, usuarios, equipo, jugadorIds);
  if (!targets.size) return { notified: 0, sent: 0 };

  const rows = Array.from(targets.values()).map(t => ({
    user_tipo: t.user_tipo,
    user_id: t.user_id,
    tipo,
    ref_id: refId,
    titulo,
    cuerpo,
    url
  }));

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/notificaciones`, {
    method: 'POST',
    headers: { ...restHeaders, Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(rows)
  });
  if (!insertRes.ok) {
    throw new Error(`Insert notificaciones: HTTP ${insertRes.status} ${await insertRes.text()}`);
  }
  const inserted = (await insertRes.json()) as any[];
  if (!inserted.length) return { notified: 0, sent: 0 }; // todo ya notificado antes

  const subByKey = new Map<string, any>();
  for (const s of subs) subByKey.set(`${s.user_tipo}:${s.user_id}`, s);

  const payload = JSON.stringify({ title: titulo, body: cuerpo, url, tag: `${tipo}_${refId}` });
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    inserted.map(async n => {
      const sub = subByKey.get(`${n.user_tipo}:${n.user_id}`);
      if (!sub) return;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 43200 }
        );
        sent++;
      } catch (err: any) {
        const code = err?.statusCode;
        if (code === 404 || code === 410) dead.push(sub.endpoint);
        else console.warn('push error', code || err?.message || err);
      }
    })
  );

  // Limpieza de suscripciones muertas (dispositivo sin permiso o desinstalado)
  for (const endpoint of dead) {
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
        { method: 'DELETE', headers: restHeaders }
      );
    } catch {
      /* best effort */
    }
  }

  return { notified: inserted.length, sent };
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Usa POST' });
    return;
  }
  try {
    const raw = req.body;
    const body: PushBody =
      typeof raw === 'string' ? (JSON.parse(raw) as PushBody) : ((raw || {}) as PushBody);
    const out = await dispatchNotification(body);
    res.status(200).json(out);
  } catch (e: any) {
    console.error('api/push:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
}
