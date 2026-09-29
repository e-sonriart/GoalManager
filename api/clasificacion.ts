/**
 * GET /api/clasificacion?url=<url ficha FFCV con cod_partido=...>
 *
 * Extrae la clasificación oficial FFCV:
 *  1) ficha_partido_ajax.php → competición/grupo/jornada + equipo local
 *  2) vis_competiciones_equipo.php → cod_grupo (si la ficha no lo trae)
 *  3) jornadas_fetch.php → cod_jornada
 *  4) clasificaciones_ajax.php → filas de clasificación normalizadas
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

const norm = (s: unknown): string =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

async function getJson(url: string): Promise<any> {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json,*/*', Referer: 'https://ffcv.es/' }
  });
  if (!r.ok) throw new Error(`FFCV HTTP ${r.status}`);
  return r.json();
}

function temporadaDeFecha(fecha: string): string {
  const m = digits(fecha).match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return '';
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  return mes >= 7 ? `${anio}-${anio + 1}` : `${anio - 1}-${anio}`;
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

    let competicion = pick(ficha, ['nombre_competicion', 'competicion']);
    let grupo = pick(ficha, ['nombre_grupo', 'grupo']);
    const jornadaTxt = pick(ficha, ['jornada', 'nombre_jornada']);
    const fecha = pick(ficha, ['fecha']);
    const codEquipo = digits(pick(ficha, ['codigo_equipo_local', 'cod_equipo_local', 'codigo_equipo']));

    let codGrupo = digits(
      pick(ficha, ['cod_grupo', 'codigo_grupo', 'codgrupo', 'CodGrupo', 'Cod_Grupo', 'id_grupo'])
    );

    if (!codGrupo) {
      if (!codEquipo) {
        res.status(404).json({ error: 'contexto_no_encontrado' });
        return;
      }
      const comps = await getJson(
        `https://ffcv.es/competiciones/api/equipos/vis_competiciones_equipo.php?codequipo=${codEquipo}`
      );
      const list: any[] = Array.isArray(comps?.competiciones) ? comps.competiciones : [];
      const nComp = norm(competicion);
      const nGrp = norm(grupo);
      const nTemp = norm(temporadaDeFecha(fecha));
      const candidates = list.filter(
        x => norm(pick(x, ['competicion'])) === nComp && (!nGrp || norm(pick(x, ['grupo'])) === nGrp)
      );
      const hit =
        (nTemp && candidates.find(x => norm(pick(x, ['temporada'])) === nTemp)) || candidates[0];
      if (!hit) {
        res.status(404).json({ error: 'contexto_no_encontrado' });
        return;
      }
      codGrupo = digits(pick(hit, ['cogido_grupo', 'cod_grupo', 'codigo_grupo']));
      if (!competicion) competicion = pick(hit, ['competicion']);
      if (!grupo) grupo = pick(hit, ['grupo']);
    }

    if (!codGrupo) {
      res.status(404).json({ error: 'contexto_no_encontrado' });
      return;
    }

    let codJornada = '';
    try {
      const jdata = await getJson(
        `https://ffcv.es/competiciones/api/filtros/jornadas_fetch.php?cod_grupo=${codGrupo}&debug=1`
      );
      const jlist: any[] = Array.isArray(jdata?.jornadas) ? jdata.jornadas : [];
      const target = digits(jornadaTxt);
      const jhit = jlist.find(x => digits(pick(x, ['nombre', 'jornada'])) === target);
      codJornada = jhit ? digits(pick(jhit, ['codjornada', 'cod_jornada', 'codigo_jornada'])) : '';
    } catch {
      /* se usa el número de la ficha */
    }
    if (!codJornada) codJornada = digits(jornadaTxt);
    if (!codJornada) {
      res.status(404).json({ error: 'contexto_no_encontrado' });
      return;
    }

    const data = await getJson(
      `https://ffcv.es/competiciones/api/clasificaciones/clasificaciones_ajax.php?cod_grupo=${codGrupo}&cod_jornada=${codJornada}`
    );
    const source: any[] = Array.isArray(data?.clasificacion) ? data.clasificacion : [];
    const rows = source.map(r => ({
      pos: String(r?.posicion ?? r?.puesto ?? ''),
      equipo: String(r?.nombre ?? ''),
      pj: String(r?.jugados ?? r?.pj ?? 0),
      g: String(r?.ganados ?? r?.g ?? 0),
      e: String(r?.empatados ?? r?.e ?? 0),
      p: String(r?.perdidos ?? r?.p ?? 0),
      gf: String(r?.goles_a_favor ?? r?.gf ?? 0),
      gc: String(r?.goles_en_contra ?? r?.gc ?? 0),
      pts: String(r?.puntos ?? r?.pts ?? 0),
      racha: Array.isArray(r?.racha_partidos)
        ? r.racha_partidos
            .map((x: any) => String(x?.tipo || '').toUpperCase())
            .filter((t: string) => t === 'G' || t === 'E' || t === 'P')
        : []
    }));

    res.status(200).json({
      ok: true,
      competicion: competicion || pick(data, ['competicion']),
      grupo: grupo || pick(data, ['grupo']),
      jornada: String(data?.jornada || jornadaTxt),
      fecha: pick(data, ['fecha_jornada']),
      codGrupo,
      codJornada,
      rows
    });
  } catch (e: any) {
    console.error('api/clasificacion:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
}
