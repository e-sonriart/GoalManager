/**
 * GET /api/clasificacion — extrae la clasificación oficial FFCV.
 *
 * Tres modos de entrada:
 *  1) ?url=<ficha FFCV con cod_partido=...>            (histórico)
 *  2) ?cod_grupo=<id>                                  (directo, sin resolver)
 *  3) ?categoria=&division=&grupo=&letra=              (resuelve cod_grupo por nombre)
 *
 * El modo 3 resuelve: temporada → competiciones_fetch → scoring por
 * categoría/división (con equivalencias es/val) → grupos_fetch → jornadas →
 * clasificaciones_ajax. El resultado (cod_grupo) se persiste en `ffcv_grupos`
 * si la tabla existe (opcional, ver ffcv_grupos.sql).
 */
export const maxDuration = 30;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const SUPABASE_URL = 'https://fycfljwckpflderfddgy.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y2Zsandja3BmbGRlcmZkZGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzE0MzMsImV4cCI6MjEwNTc0NzQzM30.PW75GFSrD7v0KgKWyhjaL6k_Po_OyJ5TTY-ABXXZdtM';

const snapHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

/** Lee la última clasificación guardada en Supabase (caché persistente anti-FFCV) */
async function getSnapshot(key: string): Promise<any | null> {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/clasificaciones?url=eq.${encodeURIComponent(key)}&select=*`,
      { headers: snapHeaders }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    return null;
  }
}

/** Guarda/actualiza la clasificación extraída (upsert por url = clave) */
async function saveSnapshot(key: string, payload: Record<string, any>): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/clasificaciones`, {
      method: 'POST',
      headers: { ...snapHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ url: key, ...payload, updated_at: new Date().toISOString() }])
    });
  } catch (e) {
    console.error('api/clasificacion saveSnapshot:', e);
  }
}

/** Persiste la resolución categoría/liga/grupo → cod_grupo (best-effort) */
async function saveGrupoMap(params: {
  categoria: string;
  division: string;
  grupo: string;
  letra: string;
  codGrupo: string;
  competicion: string;
  grupoFfcv: string;
  temporada: string;
}): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/ffcv_grupos`, {
      method: 'POST',
      headers: { ...snapHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([
        {
          key: [params.categoria, params.division, params.grupo, params.letra]
            .map(s => String(s || '').trim().toLowerCase())
            .join('|'),
          categoria: params.categoria,
          division: params.division,
          grupo: params.grupo,
          letra: params.letra,
          cod_grupo: params.codGrupo,
          competicion: params.competicion,
          grupo_ffcv: params.grupoFfcv,
          temporada: params.temporada,
          updated_at: new Date().toISOString()
        }
      ])
    });
  } catch {
    /* tabla ffcv_grupos no existe aún: la resolución sigue funcionando */
  }
}

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

/* ------------------------------------------------------------------ */
/* Resolución categoría/división/grupo → cod_grupo (scoring)           */
/* ------------------------------------------------------------------ */

/** Equivalencias es↔val y numerales por frase */
const FRASES: Record<string, string[]> = {
  primera: ['primera', '1', '1a', '1ra'],
  segunda: ['segunda', 'segona', '2', '2a', '2da'],
  tercera: ['tercera', '3', '3a', '3ra'],
  preferente: ['preferente', 'preferent'],
  autonomica: ['autonomica']
};

/** Frases candidatas de una división: completa + subconjuntos de tokens (≥2). */
function frasesDivision(div: string): string[] {
  const toks = String(div)
    .toLowerCase()
    .replace(/[ªº.]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(norm)
    .filter(Boolean);
  if (!toks.length) return [];
  const sets = toks.map(t => FRASES[t] || [t]);
  const out = new Set<string>();
  const addCombo = (idxs: number[]) => {
    let combos = [''];
    for (const i of idxs) {
      const next: string[] = [];
      for (const base of combos) for (const v of sets[i]) next.push(base + v);
      combos = next;
      if (combos.length > 48) break;
    }
    combos.forEach(c => {
      const f = c.replace(/[^a-z0-9]/g, '');
      if (f.length >= 3) out.add(f);
    });
  };
  addCombo(toks.map((_, i) => i));
  if (toks.length > 1) {
    for (let i = 0; i < toks.length; i++) {
      for (let j = i + 1; j < toks.length; j++) {
        addCombo([i, j]);
        if (toks.length >= 3 && j + 1 < toks.length) addCombo([i, j, j + 1]);
      }
    }
  }
  return [...out];
}

function scoreComp(
  c: any,
  categoria: string,
  division: string,
  conCategoria: boolean
): number {
  const h = norm(String(c?.NombreCategoria || '')) + norm(String(c?.nombre || ''));
  const cat = norm(categoria);
  let s = 0;
  if (conCategoria && cat) {
    if (!cat.split(/\s+/).filter(Boolean).every(t => h.includes(t))) return -1;
    s += 3;
  }
  if (division) {
    const frases = frasesDivision(division);
    if (frases.some(f => h.includes(f))) s += 6;
    else {
      const toks = String(division)
        .toLowerCase()
        .split(/\s+/)
        .map(norm)
        .filter(t => t.length >= 4);
      if (toks.some(t => h.includes(t))) s += 1;
      else return -1;
    }
    const divN = norm(division);
    if (divN.includes('futsal')) {
      if (h.includes('futsal')) s += 6;
      else return -1;
    } else if (h.includes('futsal')) s -= 4;
    if (divN.includes('valenta')) {
      if (h.includes('valenta')) s += 6;
      else return -1;
    } else if (h.includes('valenta')) s -= 4;
    if (h.includes('playa')) return -1;
    if (!divN.includes('femen') && h.includes('femenin')) s -= 3;
  }
  if (String(c?.Activa) === '1') s += 3;
  return s;
}

const extractNumGrupo = (n: string): string => (norm(n).match(/(\d+)$/) || [])[1] || '';
const extractLetraGrupo = (n: string): string =>
  ((String(n).trim().match(/[-\s]([A-Z])$/i) || [])[1] || '').toUpperCase();

interface Resolucion {
  codGrupo: string;
  competicion: string;
  grupo: string;
  temporada: string;
  modo: string;
}

interface ResolucionError {
  error: string;
  detalle?: string;
  candidatos?: string[];
}

async function resolverCodGrupo(
  categoria: string,
  division: string,
  grupo: string,
  letra: string
): Promise<Resolucion | ResolucionError> {
  const isErr = (x: any): x is ResolucionError => !!x?.error;

  const temps = await getJson('https://ffcv.es/competiciones/api/filtros/temporadas_fetch.php');
  const hoy = new Date();
  const lista: any[] = Array.isArray(temps?.temporadas) ? temps.temporadas : [];
  const temp =
    lista.find(t => {
      try {
        return hoy >= new Date(String(t.fecha_inicio)) && hoy <= new Date(String(t.fecha_fin));
      } catch {
        return false;
      }
    }) || lista[0];
  const temporada = String(temp?.nombre || '');

  const cdata = await getJson(
    `https://ffcv.es/competiciones/api/filtros/competiciones_fetch.php?temporada=${encodeURIComponent(
      String(temp?.cod_temporada || '')
    )}`
  );
  const comps: any[] = Array.isArray(cdata?.competiciones) ? cdata.competiciones : [];

  let modo = 'categoria+division';
  let scored = comps
    .map(c => ({ c, s: scoreComp(c, categoria, division, true) }))
    .filter(x => x.s > 0);
  if (!scored.length && division) {
    modo = 'solo-division';
    scored = comps
      .map(c => ({ c, s: scoreComp(c, '', division, false) }))
      .filter(x => x.s > 0);
  }
  if (!scored.length && categoria) {
    modo = 'solo-categoria';
    scored = comps
      .map(c => ({ c, s: scoreComp(c, categoria, '', true) }))
      .filter(x => x.s > 0);
  }
  if (!scored.length) return { error: 'liga_no_encontrada' };

  scored.sort((a, b) => b.s - a.s);
  const top = scored[0].s;
  const empates = scored.filter(x => x.s === top);
  if (empates.length > 1) {
    return {
      error: 'liga_ambigua',
      detalle: modo,
      candidatos: empates.map(
        x =>
          `${x.c.codigo}|${String(x.c.NombreCategoria || '').trim()}|${String(
            x.c.nombre || ''
          ).trim()}`
      )
    };
  }

  const comp = scored[0].c;
  const gdata = await getJson(
    `https://ffcv.es/competiciones/api/filtros/grupos_fetch.php?cod_competicion=${encodeURIComponent(
      String(comp.codigo)
    )}`
  );
  const gs: any[] = Array.isArray(gdata?.grupos) ? gdata.grupos : [];
  if (!gs.length) return { error: 'sin_grupos', detalle: String(comp.nombre || '') };

  let hit: any[] = [];
  const num = (String(grupo).match(/(\d+)/) || [])[1] || '';
  const let_ = (letra || extractLetraGrupo(grupo)).toUpperCase();
  if (num) hit = gs.filter(x => extractNumGrupo(String(x.nombre)) === num);
  if (!hit.length && let_)
    hit = gs.filter(x => extractLetraGrupo(String(x.nombre)) === let_);
  if (!hit.length && gs.length === 1) hit = gs;
  if (!hit.length) {
    return {
      error: num || let_ ? 'grupo_no_encontrado' : 'grupo_requerido',
      detalle: String(comp.nombre || ''),
      candidatos: gs.map(x => `${x.codigo}|${String(x.nombre || '').trim()}`)
    };
  }
  if (hit.length > 1) {
    return {
      error: 'grupo_ambiguo',
      detalle: String(comp.nombre || ''),
      candidatos: hit.map(x => `${x.codigo}|${String(x.nombre || '').trim()}`)
    };
  }

  return {
    codGrupo: String(hit[0].codigo || ''),
    competicion: String(comp.nombre || '').trim(),
    grupo: String(hit[0].nombre || '').trim(),
    temporada,
    modo
  };
}

/* ------------------------------------------------------------------ */
/* Clasificación por cod_grupo + jornada                                */
/* ------------------------------------------------------------------ */

/** Última jornada con fecha ya disputada (fallback: la última de la lista). */
function elegirJornada(jlist: any[], fechaPrevia: string): string {
  const target = digits(fechaPrevia);
  if (target) {
    const hit = jlist.find(x => digits(x?.fecha_jornada || x?.fecha || '') === target);
    if (hit) return digits(pick(hit, ['codjornada', 'cod_jornada', 'codigo_jornada']));
  }
  const parse = (v: any): number => {
    const m = String(v || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return -1;
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  };
  const hoy = Date.now();
  const pasadas = jlist
    .map(x => ({ x, ts: parse(x?.fecha_jornada) }))
    .filter(o => o.ts >= 0 && o.ts <= hoy)
    .sort((a, b) => b.ts - a.ts);
  if (pasadas.length) return digits(pick(pasadas[0].x, ['codjornada', 'cod_jornada', 'codigo_jornada']));
  const last = jlist[jlist.length - 1];
  return last ? digits(pick(last, ['codjornada', 'cod_jornada', 'codigo_jornada'])) : '';
}

function normalizarFilas(data: any): any[] {
  const source: any[] = Array.isArray(data?.clasificacion) ? data.clasificacion : [];
  return source.map(r => ({
    pos: String(r?.posicion ?? r?.puesto ?? ''),
    equipo: String(r?.nombre ?? ''),
    pj: String(r?.jugados ?? r?.pj ?? 0),
    g: String(r?.ganados ?? r?.g ?? 0),
    e: String(r?.empatados ?? r?.e ?? 0),
    p: String(r?.perdidos ?? r?.p ?? 0),
    gf: String(r?.goles_a_favor ?? r?.gf ?? 0),
    gc: String(r?.goles_en_contra ?? r?.gc ?? 0),
    pts: String(r?.puntos ?? r?.pts ?? 0),
    color: String(r?.color ?? ''),
    img: String(r?.url_img ?? ''),
    racha: Array.isArray(r?.racha_partidos)
      ? r.racha_partidos
          .map((x: any) => String(x?.tipo || '').toUpperCase())
          .filter((t: string) => t === 'G' || t === 'E' || t === 'P')
      : []
  }));
}

async function clasificacionPorGrupo(
  codGrupo: string,
  codJornadaPrevia: string
): Promise<{ competicion: string; grupo: string; jornada: string; fecha: string; rows: any[] }> {
  const jdata = await getJson(
    `https://ffcv.es/competiciones/api/filtros/jornadas_fetch.php?cod_grupo=${encodeURIComponent(
      codGrupo
    )}&debug=1`
  );
  const jlist: any[] = Array.isArray(jdata?.jornadas) ? jdata.jornadas : [];
  const codJornada = elegirJornada(jlist, codJornadaPrevia);
  if (!codJornada) throw new Error('sin_jornadas');

  const data = await getJson(
    `https://ffcv.es/competiciones/api/clasificaciones/clasificaciones_ajax.php?cod_grupo=${encodeURIComponent(
      codGrupo
    )}&cod_jornada=${encodeURIComponent(codJornada)}`
  );
  return {
    competicion: String(data?.competicion || ''),
    grupo: String(data?.grupo || ''),
    jornada: String(data?.jornada || codJornada),
    fecha: pick(data, ['fecha_jornada']),
    rows: normalizarFilas(data)
  };
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */

export default async function handler(req: any, res: any): Promise<void> {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Usa GET' });
      return;
    }

    const q = (req.query || {}) as Record<string, string>;
    const force = q.force === '1' || q.force === 'true';

    const categoria = String(q.categoria || '').trim();
    const division = String(q.division || '').trim();
    const grupo = String(q.grupo || '').trim();
    const letra = String(q.letra || '').trim();
    const codGrupoParam = digits(q.cod_grupo || '');
    const raw = String(q.url || '');

    const snapshotKey = (base: string): string => base;

    let codGrupo = codGrupoParam;
    let contextKey = '';
    let resolucion: Resolucion | null = null;

    if (!codGrupo && (categoria || division || grupo)) {
      const r = await resolverCodGrupo(categoria, division, grupo, letra);
      if ('error' in r) {
        res.status(404).json({
          error: r.error,
          detalle: r.detalle || '',
          candidatos: r.candidatos || []
        });
        return;
      }
      resolucion = r;
      codGrupo = r.codGrupo;
      void saveGrupoMap({
        categoria,
        division,
        grupo,
        letra,
        codGrupo: r.codGrupo,
        competicion: r.competicion,
        grupoFfcv: r.grupo,
        temporada: r.temporada
      });
    }

    if (codGrupo) contextKey = snapshotKey(`codGrupo:${codGrupo}`);
    else if (raw) {
      try {
        const u = new URL(raw);
        if (!/(^|\.)ffcv\.es$/.test(u.hostname)) throw new Error('host no permitido');
        if (!digits(u.searchParams.get('cod_partido') || '')) {
          res.status(400).json({ error: 'sin_cod_partido' });
          return;
        }
        contextKey = snapshotKey(raw);
      } catch {
        res.status(400).json({ error: 'url_ffcv_invalida' });
        return;
      }
    } else {
      res.status(400).json({ error: 'faltan_parametros' });
      return;
    }

    if (!force) {
      const snap = await getSnapshot(contextKey);
      if (snap && Array.isArray(snap.rows) && snap.rows.length) {
        res.status(200).json({
          ok: true,
          competicion: snap.competicion || '',
          grupo: snap.grupo || '',
          jornada: snap.jornada || '',
          fecha: snap.fecha_jornada || '',
          cod_grupo: codGrupo || '',
          rows: snap.rows,
          updatedAt: snap.updated_at || '',
          cached: true
        });
        return;
      }
    }

    if (codGrupo && !raw) {
      const clasif = await clasificacionPorGrupo(codGrupo, '');
      const updatedAt = new Date().toISOString();
      await saveSnapshot(contextKey, {
        competicion: resolucion?.competicion || clasif.competicion,
        grupo: resolucion?.grupo || clasif.grupo,
        jornada: clasif.jornada,
        fecha_jornada: clasif.fecha,
        rows: clasif.rows
      });
      res.status(200).json({
        ok: true,
        competicion: clasif.competicion || resolucion?.competicion || '',
        grupo: clasif.grupo || resolucion?.grupo || '',
        jornada: clasif.jornada,
        fecha: clasif.fecha,
        cod_grupo: codGrupo,
        rows: clasif.rows,
        updatedAt
      });
      return;
    }

    /* Modo histórico: ficha del partido → cod_grupo → clasificación */
    const codPartido = digits(new URL(raw).searchParams.get('cod_partido') || '');
    const ficha = await getJson(
      `https://ffcv.es/competiciones/api/partidos/ficha_partido_ajax.php?cod_partido=${codPartido}`
    );

    let competicion = pick(ficha, ['nombre_competicion', 'competicion']);
    let grupoNombre = pick(ficha, ['nombre_grupo', 'grupo']);
    const jornadaTxt = pick(ficha, ['jornada', 'nombre_jornada']);
    const fecha = pick(ficha, ['fecha']);
    const codEquipo = digits(
      pick(ficha, ['codigo_equipo_local', 'cod_equipo_local', 'codigo_equipo'])
    );

    let codGrupoFicha = digits(
      pick(ficha, ['cod_grupo', 'codigo_grupo', 'codgrupo', 'CodGrupo', 'Cod_Grupo', 'id_grupo'])
    );

    if (!codGrupoFicha) {
      if (!codEquipo) {
        res.status(404).json({ error: 'contexto_no_encontrado' });
        return;
      }
      const comps = await getJson(
        `https://ffcv.es/competiciones/api/equipos/vis_competiciones_equipo.php?codequipo=${codEquipo}`
      );
      const list: any[] = Array.isArray(comps?.competiciones) ? comps.competiciones : [];
      const nComp = norm(competicion);
      const nGrp = norm(grupoNombre);
      const nTemp = norm(temporadaDeFecha(fecha));
      const candidates = list.filter(
        x =>
          norm(pick(x, ['competicion'])) === nComp &&
          (!nGrp || norm(pick(x, ['grupo'])) === nGrp)
      );
      const hit =
        (nTemp && candidates.find(x => norm(pick(x, ['temporada'])) === nTemp)) ||
        candidates[0];
      if (!hit) {
        res.status(404).json({ error: 'contexto_no_encontrado' });
        return;
      }
      codGrupoFicha = digits(pick(hit, ['cogido_grupo', 'cod_grupo', 'codigo_grupo']));
      if (!competicion) competicion = pick(hit, ['competicion']);
      if (!grupoNombre) grupoNombre = pick(hit, ['grupo']);
    }

    if (!codGrupoFicha) {
      res.status(404).json({ error: 'contexto_no_encontrado' });
      return;
    }

    const clasif = await clasificacionPorGrupo(codGrupoFicha, jornadaTxt);
    const updatedAt = new Date().toISOString();
    await saveSnapshot(contextKey, {
      competicion: competicion || clasif.competicion,
      grupo: grupoNombre || clasif.grupo,
      jornada: String(clasif.jornada || jornadaTxt),
      fecha_jornada: clasif.fecha || fecha,
      rows: clasif.rows
    });

    res.status(200).json({
      ok: true,
      competicion: competicion || clasif.competicion,
      grupo: grupoNombre || clasif.grupo,
      jornada: String(clasif.jornada || jornadaTxt),
      fecha: clasif.fecha || fecha,
      cod_grupo: codGrupoFicha,
      rows: clasif.rows,
      updatedAt
    });
  } catch (e: any) {
    console.error('api/clasificacion:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
}
