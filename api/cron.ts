/**
 * GET /api/cron?secret=... — recordatorios automáticos de partidos y entrenamientos.
 *
 * Disparado cada 5 minutos desde Supabase (pg_cron + pg_net, ver notificaciones-push.sql).
 * Ventanas: 24 h antes (ref ..._r24), 5 h antes (ref ..._r5) y 2 h antes (ref ..._r2),
 * con tolerancia de ±14 min.
 * Los refs estables + índice único de `notificaciones` garantizan que no se repiten.
 *
 * NOTA: llama a /api/push por HTTP en lugar de importarlo (los imports cruzados
 * dentro de api/ no se empaquetan bien en Vercel).
 */

const CRON_SECRET = 'gmpush_4f7a9c2e';
const PUSH_URL = 'https://goal-manager-zeta.vercel.app/api/push';
const SUPABASE_URL = 'https://fycfljwckpflderfddgy.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y2Zsandja3BmbGRlcmZkZGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzE0MzMsImV4cCI6MjEwNTc0NzQzM30.PW75GFSrD7v0KgKWyhjaL6k_Po_OyJ5TTY-ABXXZdtM';
const TZ = 'Europe/Madrid';
const GRACE_MS = 14 * 60 * 1000;
const D24 = 24 * 3600 * 1000;
const D5 = 5 * 3600 * 1000;
const D2 = 2 * 3600 * 1000;

interface PushEvent {
  tipo: string;
  equipo?: string;
  refId?: string;
  jugadorIds?: string[];
  titulo: string;
  cuerpo?: string;
  url?: string;
}

async function restGet(path: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
  });
  if (!r.ok) throw new Error(`Supabase ${path}: HTTP ${r.status}`);
  return (await r.json()) as any[];
}

/** Ahora en milisegundos UTC, interpretando el reloj como hora local del club (Europa/Madrid) */
const clubNowMs = (): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const num = (type: string): number => Number(parts.find(p => p.type === type)?.value || 0);
  return Date.UTC(num('year'), num('month') - 1, num('day'), num('hour'), num('minute'));
};

/** Inicio del evento (fecha con o sin hora) como si fuera hora del club → UTC */
const startMs = (fecha?: string, hora?: string): number | null => {
  if (!fecha || fecha.length < 10) return null;
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  let hh = 0;
  let mm = 0;
  if (fecha.includes('T') && fecha.length >= 16) {
    hh = Number(fecha.slice(11, 13));
    mm = Number(fecha.slice(14, 16));
  } else if (hora && hora.length >= 5) {
    hh = Number(hora.slice(0, 2));
    mm = Number(hora.slice(3, 5));
  }
  return Date.UTC(y, m - 1, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0);
};

/** Fecha legible sin depender de la zona horaria del servidor */
const legible = (fecha?: string, hora?: string): string => {
  if (!fecha) return '';
  const [, m, d] = fecha.slice(0, 10).split('-');
  const t = fecha.includes('T') ? fecha.slice(11, 16) : hora || '';
  return `${d}/${m}${t ? ` ${t}` : ''}`;
};

const isFinalizado = (v: unknown): boolean =>
  v === true || v === 'true' || v === '1' || v === 1;

export default async function handler(req: any, res: any): Promise<void> {
  try {
    const q = (req && req.query) || {};
    const secret = (Array.isArray(q.secret) ? q.secret[0] : q.secret) || '';
    const auth = String((req && req.headers && req.headers.authorization) || '');
    if (secret !== CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const [partidos, sesiones] = await Promise.all([
      restGet('partidos?select=id,equipo,fecha,hora,campo,local,visitante,convocados,finalizado'),
      restGet('sesiones?select=id,equipo,fecha,hora,lugar,titulo,objetivo')
    ]);

    const now = clubNowMs();
    const near = (diff: number, target: number): boolean => Math.abs(diff - target) <= GRACE_MS;
    const events: PushEvent[] = [];

    for (const p of partidos) {
      if (isFinalizado(p.finalizado)) continue;
      const start = startMs(p.fecha, p.hora);
      if (start === null) continue;
      const diff = start - now;
      const convocados: string[] = Array.isArray(p.convocados)
        ? p.convocados.filter((v: unknown): v is string => typeof v === 'string' && !!v)
        : [];
      const base = {
        equipo: p.equipo,
        jugadorIds: convocados.length ? convocados : undefined,
        url: '/'
      };
      if (near(diff, D24)) {
        events.push({
          ...base,
          tipo: 'recordatorio24',
          refId: `${p.id}_r24`,
          titulo: `⏰ Mañana juega ${p.equipo}`,
          cuerpo: `${p.local} vs ${p.visitante} · ${legible(p.fecha, p.hora)}${
            p.campo ? ` · ${p.campo}` : ''
          }`
        });
      }
      if (near(diff, D5)) {
        events.push({
          ...base,
          tipo: 'recordatorio5',
          refId: `${p.id}_r5`,
          titulo: `⏱ ${p.equipo} juega en 5 horas`,
          cuerpo: `${p.local} vs ${p.visitante} · ${legible(p.fecha, p.hora)}${
            p.campo ? ` · ${p.campo}` : ''
          }`
        });
      }
      if (near(diff, D2)) {
        events.push({
          ...base,
          tipo: 'recordatorio2',
          refId: `${p.id}_r2`,
          titulo: `⚽ ${p.equipo} empieza pronto`,
          cuerpo: `${p.local} vs ${p.visitante}${p.campo ? ` · ${p.campo}` : ''}`
        });
      }
    }

    for (const s of sesiones) {
      const start = startMs(s.fecha, s.hora);
      if (start === null) continue;
      const diff = start - now;
      const base = { equipo: s.equipo, url: '/' };
      const detalle = `${s.hora || ''}${s.lugar ? ` · ${s.lugar}` : ''}${
        s.titulo ? ` · ${s.titulo}` : ''
      }`.trim();
      if (near(diff, D24)) {
        events.push({
          ...base,
          tipo: 'recordatorio24',
          refId: `${s.id}_r24`,
          titulo: `⏰ Mañana: entrenamiento de ${s.equipo}`,
          cuerpo: detalle
        });
      }
      if (near(diff, D5)) {
        events.push({
          ...base,
          tipo: 'recordatorio5',
          refId: `${s.id}_r5`,
          titulo: `⏰ Entrenamiento de ${s.equipo} en 5 horas`,
          cuerpo: detalle
        });
      }
      if (near(diff, D2)) {
        events.push({
          ...base,
          tipo: 'recordatorio2',
          refId: `${s.id}_r2`,
          titulo: `⏰ Entrenamiento de ${s.equipo} en 2 horas`,
          cuerpo: detalle
        });
      }
    }

    let pushResult: any = null;
    if (events.length) {
      const r = await fetch(PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      });
      const text = await r.text();
      try {
        pushResult = JSON.parse(text);
      } catch {
        pushResult = { status: r.status, raw: text.slice(0, 300) };
      }
      if (!r.ok) throw new Error(`push HTTP ${r.status}: ${text.slice(0, 300)}`);
    }

    res.status(200).json({ ok: true, jobs: events.length, pushResult });
  } catch (e: any) {
    console.error('api/cron:', e);
    res.status(500).json({ error: String(e?.stack || e?.message || e) });
  }
}
