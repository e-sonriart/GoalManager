/**
 * GET/POST /api/actualizar-clasificaciones?secret=...
 *
 * Refresca la caché de clasificaciones FFCV (tabla `clasificaciones` en Supabase):
 *  - Cron de los lunes (pg_cron + pg_net, ver clasificaciones.sql) con secret.
 *  - Botón "Actualizar clasificaciones" del panel admin (sin secret, con throttle).
 *
 * Toma los links de la tabla `equipos` ("linkClasificacion") o de body.urls,
 * y llama a /api/clasificacion?...&force=1 por cada uno (sin imports cruzados
 * dentro de api/, porque no se empaquetan bien en Vercel).
 */
export const maxDuration = 60;

const CRON_SECRET = 'gmpush_4f7a9c2e';
const BASE_URL = 'https://goal-manager-zeta.vercel.app';
const SUPABASE_URL = 'https://fycfljwckpflderfddgy.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y2Zsandja3BmbGRlcmZkZGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzE0MzMsImV4cCI6MjEwNTc0NzQzM30.PW75GFSrD7v0KgKWyhjaL6k_Po_OyJ5TTY-ABXXZdtM';
const THROTTLE_MS = 10 * 60 * 1000;

const snapHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

const isValidFfcvUrl = (u: string): boolean => {
  try {
    const parsed = new URL(u);
    if (!/(^|\.)ffcv\.es$/.test(parsed.hostname)) return false;
    return /\d+/.test(parsed.searchParams.get('cod_partido') || '');
  } catch {
    return false;
  }
};

async function restGet(path: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: snapHeaders });
  if (!r.ok) throw new Error(`Supabase ${path}: HTTP ${r.status}`);
  return (await r.json()) as any[];
}

async function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item === undefined) break;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export default async function handler(req: any, res: any): Promise<void> {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Usa GET o POST' });
      return;
    }

    const secret = String((req.query && req.query.secret) || '');
    const isCron = secret === CRON_SECRET;

    if (req.query?.fecha === '1') {
      const last = await restGet('clasificaciones?select=updated_at&order=updated_at.desc&limit=1')
        .then(rows => rows?.[0]?.updated_at || '')
        .catch(() => '');
      res.status(200).json({ ok: true, fecha: last });
      return;
    }

    if (!isCron) {
      const last = await restGet('clasificaciones?select=updated_at&order=updated_at.desc&limit=1')
        .then(rows => rows?.[0]?.updated_at || '')
        .catch(() => '');
      if (last && Date.now() - Date.parse(last) < THROTTLE_MS) {
        res.status(429).json({ error: 'actualizado_recientemente', updated_at: last });
        return;
      }
    }

    let urls: string[] = [];
    const bodyUrls = Array.isArray(req.body?.urls) ? req.body.urls : [];
    urls = bodyUrls.map((u: unknown) => String(u || '').trim()).filter(isValidFfcvUrl);
    if (!urls.length) {
      const equipos = await restGet('equipos?select="linkClasificacion"');
      urls = Array.from(
        new Set(
          equipos
            .map(e => String(e.linkClasificacion || '').trim())
            .filter(u => u && isValidFfcvUrl(u))
        )
      );
    }

    // Grupos ya resueltos por la vía categoría/liga/grupo (tabla ffcv_grupos)
    let codGrupos: string[] = [];
    if (!bodyUrls.length) {
      try {
        const rows = await restGet('ffcv_grupos?select=cod_grupo');
        codGrupos = Array.from(
          new Set(
            rows
              .map(r => String(r.cod_grupo || '').trim())
              .filter(g => /^\d+$/.test(g))
          )
        );
      } catch {
        codGrupos = [];
      }
    }

    const tarefas: { qs: string }[] = [
      ...urls.map(u => ({ qs: `url=${encodeURIComponent(u)}` })),
      ...codGrupos.map(g => ({ qs: `cod_grupo=${encodeURIComponent(g)}` }))
    ];

    if (!tarefas.length) {
      res.status(200).json({
        ok: true,
        total: 0,
        actualizados: 0,
        errores: 0,
        fecha: new Date().toISOString()
      });
      return;
    }

    let actualizados = 0;
    let errores = 0;
    await runPool(tarefas, 3, async t => {
      try {
        const r = await fetch(`${BASE_URL}/api/clasificacion?${t.qs}&force=1`);
        const j: any = await r.json().catch(() => ({}));
        if (r.ok && j?.ok) actualizados++;
        else errores++;
      } catch {
        errores++;
      }
    });

    res.status(200).json({
      ok: true,
      total: tarefas.length,
      urls: urls.length,
      grupos: codGrupos.length,
      actualizados,
      errores,
      fecha: new Date().toISOString()
    });
  } catch (e: any) {
    console.error('api/actualizar-clasificaciones:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
}
