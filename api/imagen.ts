/**
 * GET /api/imagen?url=<url remota> — proxy de escudos para el canvas.
 *
 * El canvas necesita imágenes con CORS. Los escudos FFCV
 * (appwebffcv.novanet.es) y algunos de Supabase no envían
 * `Access-Control-Allow-Origin`, así que se descargan aquí y se sirven
 * desde el mismo origen de la app con cabeceras de caché.
 *
 * Solo se permiten hosts de confianza (allowlist) para evitar un proxy abierto.
 */
export const maxDuration = 15;

const ALLOWED_HOSTS = new Set([
  'appwebffcv.novanet.es',
  'fycfljwckpflderfddgy.supabase.co'
]);

/** Dominios de escudos FFCV (appwebffcv / appffcv.filesnovanet...). */
const ALLOWED_SUFFIXES = ['novanet.es', 'filesnovanet.es'];

const hostPermitido = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_SUFFIXES.some(sufijo => host === sufijo || host.endsWith(`.${sufijo}`));
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export default async function handler(req: any, res: any): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Usa GET' });
    return;
  }

  const raw = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
  if (!raw || typeof raw !== 'string') {
    res.status(400).json({ error: 'falta_url' });
    return;
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    res.status(400).json({ error: 'url_invalida' });
    return;
  }

  if (target.protocol !== 'https:' || !hostPermitido(target.hostname)) {
    res.status(403).json({ error: 'host_no_permitido' });
    return;
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        'User-Agent': UA,
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!upstream.ok) {
      res.status(upstream.status === 404 ? 404 : 502).json({ error: 'no_se_pudo_descargar' });
      return;
    }

    const tipo = (upstream.headers.get('content-type') || 'image/png').split(';')[0].trim();
    if (!tipo.startsWith('image/')) {
      res.status(415).json({ error: 'no_es_imagen' });
      return;
    }

    const bytes = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', tipo);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    res.status(200).send(bytes);
  } catch {
    res.status(502).json({ error: 'fallo_proxy' });
  }
}
