/**
 * GET /api/cron?secret=... — recordatorios automáticos de partidos y entrenamientos.
 *
 * Disparado cada 5 minutos desde Supabase (pg_cron + pg_net, ver notificaciones-push.sql).
 * Ventanas: 24 h antes (ref ..._r24) y 2 h antes (ref ..._r2), con tolerancia de ±14 min.
 * Los refs estables + índice único de `notificaciones` garantizan que no se repiten.
 */
import { dispatchNotification, restGet } from './push';

const CRON_SECRET = 'gmpush_4f7a9c2e';
const TZ = 'Europe/Madrid';
const GRACE_MS = 14 * 60 * 1000;
const D24 = 24 * 3600 * 1000;
const D2 = 2 * 3600 * 1000;

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
  const num = (type: string): number =>
    Number(parts.find(p => p.type === type)?.value || 0);
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
    const jobs: Promise<{ notified: number; sent: number }>[] = [];

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
        jobs.push(
          dispatchNotification({
            ...base,
            tipo: 'recordatorio24',
            refId: `${p.id}_r24`,
            titulo: `⏰ Mañana juega ${p.equipo}`,
            cuerpo: `${p.local} vs ${p.visitante} · ${legible(p.fecha, p.hora)}${
              p.campo ? ` · ${p.campo}` : ''
            }`
          })
        );
      }
      if (near(diff, D2)) {
        jobs.push(
          dispatchNotification({
            ...base,
            tipo: 'recordatorio2',
            refId: `${p.id}_r2`,
            titulo: `⚽ ${p.equipo} empieza pronto`,
            cuerpo: `${p.local} vs ${p.visitante}${p.campo ? ` · ${p.campo}` : ''}`
          })
        );
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
        jobs.push(
          dispatchNotification({
            ...base,
            tipo: 'recordatorio24',
            refId: `${s.id}_r24`,
            titulo: `⏰ Mañana: entrenamiento de ${s.equipo}`,
            cuerpo: detalle
          })
        );
      }
      if (near(diff, D2)) {
        jobs.push(
          dispatchNotification({
            ...base,
            tipo: 'recordatorio2',
            refId: `${s.id}_r2`,
            titulo: `⏰ Entrenamiento de ${s.equipo} en 2 horas`,
            cuerpo: detalle
          })
        );
      }
    }

    const results = await Promise.allSettled(jobs);
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => String(r.reason?.message || r.reason));
    res.status(200).json({ ok: true, jobs: jobs.length, results: results.length, errors });
  } catch (e: any) {
    console.error('api/cron:', e);
    res.status(500).json({ error: String(e?.stack || e?.message || e) });
  }
}
