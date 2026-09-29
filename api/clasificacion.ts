/**
 * GET /api/clasificacion?url=<url ficha FFCV con cod_partido=...>
 *
 * Extrae la clasificación oficial de la FFCV:
 *  1) ficha_partido_ajax.php → cod_grupo + cod_jornada (+ nombres)
 *  2) clasificaciones_html.php → tabla HTML con todas las columnas
 * Devuelve la tabla como HTML para que el cliente la pinte en su ventana.
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const pick = (obj: any, keys: string[]): string => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const digits = (v: unknown): string => String(v ?? '').replace(/\D+/g, '');

async function getJson(url: string): Promise<any> {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json,*/*', Referer: 'https://ffcv.es/' }
  });
  if (!r.ok) throw new Error(`FFCV HTTP ${r.status}`);
  return r.json();
}

export default async function handler(req: any, res: any): Promise<void> {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Usa GET' });
      return;
    }

    const raw = String((req && req.query && req.query.url) || '');
    let codPartido = '';
    try {
      const u = new URL(raw);
      if (!/(^|\.)ffcv\.es$/.test(u.hostname)) throw new Error('host no permitido');
      codPartido = digits(u.searchParams.get('cod_partido') || '');
    } catch {
      res.status(400).json({ error: 'url_ffcv_invalida' });
      return;
    }
    if (!codPartido) {
      res.status(400).json({ error: 'sin_cod_partido' });
      return;
    }

    const ficha = await getJson(
      `https://ffcv.es/competiciones/api/partidos/ficha_partido_ajax.php?cod_partido=${codPartido}`
    );

    let codGrupo = digits(
      pick(ficha, ['cod_grupo', 'codigo_grupo', 'codgrupo', 'CodGrupo', 'Cod_Grupo', 'id_grupo'])
    );
    let codJornada = digits(
      pick(ficha, ['cod_jornada', 'codigo_jornada', 'codjornada', 'CodJornada', 'Cod_Jornada', 'id_jornada'])
    );
    const competicion = pick(ficha, ['nombre_competicion', 'competicion', 'nombre_competition']);
    const grupo = pick(ficha, ['nombre_grupo', 'grupo']);
    let jornadaTxt = pick(ficha, ['nombre_jornada', 'jornada', 'jornada_nombre']);

    if (codGrupo && !codJornada) {
      try {
        const target = digits(jornadaTxt);
        const jdata = await getJson(
          `https://ffcv.es/competiciones/api/filtros/jornadas_fetch.php?cod_grupo=${codGrupo}&debug=1`
        );
        const list: any[] = Array.isArray(jdata?.jornadas) ? jdata.jornadas : [];
        const hit = list.find(x => digits(pick(x, ['nombre', 'jornada', 'numero_jornada'])) === target);
        if (hit) {
          codJornada = digits(pick(hit, ['cod_jornada', 'codigo_jornada', 'id']));
          if (!jornadaTxt) jornadaTxt = pick(hit, ['nombre', 'jornada']);
        }
      } catch {
        /* sin jornada no hay clasificación */
      }
    }

    if (!codGrupo || !codJornada) {
      res.status(404).json({ error: 'contexto_no_encontrado', codGrupo, codJornada });
      return;
    }

    const r = await fetch(
      `https://ffcv.es/competiciones/api/clasificaciones/clasificaciones_html.php?cod_grupo=${codGrupo}&cod_jornada=${codJornada}`,
      { headers: { 'User-Agent': UA, Accept: 'text/html,*/*', Referer: 'https://ffcv.es/' } }
    );
    if (!r.ok) {
      res.status(502).json({ error: `ffcv_http_${r.status}` });
      return;
    }
    const html = await r.text();

    res.status(200).json({
      ok: true,
      competicion,
      grupo,
      jornada: jornadaTxt,
      codGrupo,
      codJornada,
      html
    });
  } catch (e: any) {
    console.error('api/clasificacion:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
}
