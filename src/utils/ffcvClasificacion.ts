/**
 * Extracción de la clasificación oficial FFCV vía proxy serverless
 * (/api/clasificacion), que devuelve filas normalizadas.
 *
 * Dos vías de entrada:
 *  - por link oficial (equipo.linkClasificacion con cod_partido)
 *  - por datos del equipo (categoria/division/grupo/letra): el server
 *    resuelve el cod_grupo y cachea en Supabase.
 */

export interface FfcvStandingsRow {
  pos: string;
  equipo: string;
  pj: string;
  g: string;
  e: string;
  p: string;
  gf: string;
  gc: string;
  pts: string;
  color: string;
  img: string;
  racha: string[];
}

export interface FfcvClasificacion {
  competicion: string;
  grupo: string;
  jornada: string;
  fecha: string;
  rows: FfcvStandingsRow[];
  updatedAt: string;
}

export interface FfcvGrupoParams {
  categoria?: string;
  division?: string;
  grupo?: string;
  letra?: string;
}

async function requestClasificacion(qs: string): Promise<FfcvClasificacion> {
  const res = await fetch(`/api/clasificacion?${qs}`);
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data?.ok || !Array.isArray(data.rows) || !data.rows.length) {
    const err: any = new Error(String(data?.error || `HTTP ${res.status}`));
    err.candidatos = Array.isArray(data?.candidatos) ? data.candidatos : [];
    err.detalle = String(data?.detalle || '');
    throw err;
  }
  return {
    competicion: String(data.competicion || ''),
    grupo: String(data.grupo || ''),
    jornada: String(data.jornada || ''),
    fecha: String(data.fecha || ''),
    rows: data.rows as FfcvStandingsRow[],
    updatedAt: String(data.updatedAt || '')
  };
}

/** Clasificación por link oficial de la FFCV (ficha con cod_partido). */
export async function fetchFfcvClasificacion(url: string): Promise<FfcvClasificacion> {
  return requestClasificacion(`url=${encodeURIComponent(url)}`);
}

/** Clasificación resolviendo el grupo FFCV con los datos del equipo. */
export async function fetchFfcvClasificacionGrupo(params: FfcvGrupoParams): Promise<FfcvClasificacion> {
  const qs = new URLSearchParams();
  if (params.categoria) qs.set('categoria', params.categoria);
  if (params.division) qs.set('division', params.division);
  if (params.grupo) qs.set('grupo', params.grupo);
  if (params.letra) qs.set('letra', params.letra);
  if (![...qs.keys()].length) throw new Error('sin_datos_equipo');
  return requestClasificacion(qs.toString());
}

/** Devuelve la mejor vía FFCV de un equipo: link oficial o datos. */
export function ffcvParamsDeEquipo(equipo: {
  linkClasificacion?: string;
  categoria?: string;
  division?: string;
  grupo?: string;
  letra?: string;
}): { tipo: 'link'; url: string } | { tipo: 'grupo'; params: FfcvGrupoParams } | null {
  const link = equipo.linkClasificacion?.trim();
  if (link) return { tipo: 'link', url: link };
  const params: FfcvGrupoParams = {
    categoria: equipo.categoria?.trim(),
    division: equipo.division?.trim(),
    grupo: equipo.grupo?.trim(),
    letra: equipo.letra?.trim()
  };
  if (params.categoria || params.division) return { tipo: 'grupo', params };
  return null;
}

const CACHE_TTL = 5 * 60 * 1000;
const CACHE_TTL_GRUPO = 30 * 60 * 1000;
const cache = new Map<string, { ts: number; data: FfcvClasificacion | null }>();

function cacheGet(key: string, ttl: number): FfcvClasificacion | null | undefined {
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.ts >= ttl) return undefined;
  return hit.data;
}

function cacheSet(key: string, data: FfcvClasificacion | null): void {
  cache.set(key, { ts: Date.now(), data });
}

async function fetchClasificacionCached(
  key: string,
  loader: () => Promise<FfcvClasificacion>,
  ttl: number
): Promise<FfcvClasificacion> {
  const hit = cacheGet(key, ttl);
  if (hit !== undefined) {
    if (hit) return hit;
    throw new Error('error_extraccion');
  }
  try {
    const data = await loader();
    cacheSet(key, data);
    return data;
  } catch (e) {
    cacheSet(key, null);
    throw e;
  }
}

export function fetchFfcvClasificacionLinkCached(url: string): Promise<FfcvClasificacion> {
  return fetchClasificacionCached(`url:${url}`, () => fetchFfcvClasificacion(url), CACHE_TTL);
}

export function fetchFfcvClasificacionGrupoCached(
  params: FfcvGrupoParams
): Promise<FfcvClasificacion> {
  const key = `grupo:${params.categoria || ''}|${params.division || ''}|${
    params.grupo || ''
  }|${params.letra || ''}`;
  return fetchClasificacionCached(key, () => fetchFfcvClasificacionGrupo(params), CACHE_TTL_GRUPO);
}

/** Vacia la caché local (tras una actualización manual del admin) */
export function clearFfcvClasificacionCache(): void {
  cache.clear();
}

async function runPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

export type EstadoClasif = 'ok' | 'sin-link' | 'error';

export interface ClasifTeamResumen {
  nombre: string;
  meta: string;
  estado: EstadoClasif;
  title: string;
  sub: string;
  rows: FfcvStandingsRow[];
  updatedAt: string;
  /** Moto del fallo (p. ej. liga ambigua con candidatos) */
  nota?: string;
}

export interface ClasifCategoriaResumen {
  categoria: string;
  equipos: ClasifTeamResumen[];
}

interface EquipoLike {
  nombre: string;
  categoria: string;
  letra?: string;
  division?: string;
  grupo?: string;
  linkClasificacion?: string;
}

interface CategoriaLike {
  nombre: string;
}

const NOTAS_ERROR: Record<string, string> = {
  liga_no_encontrada: 'No se encontró esa liga en la FFCV con la categoría/división del equipo.',
  liga_ambigua: 'Hay varias ligas posibles con esos datos: ajusta la división o añade el link oficial.',
  grupo_no_encontrado: 'No se encontró el grupo (o la letra) dentro de esa liga.',
  grupo_ambiguo: 'Hay varios grupos posibles en esa liga.',
  grupo_requerido: 'Falta el grupo del equipo para encontrar la clasificación.',
  sin_grupos: 'Esa liga no tiene grupos publicados.',
  sin_datos_equipo: 'El equipo no tiene link ni datos de liga/grupo.',
  error_extraccion: 'No se pudo extraer la clasificación de la FFCV.'
};

function notaDeError(err: any): string {
  const base = String(err?.message || '');
  const nota = NOTAS_ERROR[base] || 'No se pudo extraer la clasificación de la FFCV.';
  const cands: string[] = Array.isArray(err?.candidatos) ? err.candidatos : [];
  if (cands.length) {
    const detalle = err?.detalle ? ` (${err.detalle})` : '';
    return `${nota}${detalle} Candidatos: ${cands
      .slice(0, 4)
      .map(c => c.split('|').slice(1).filter(Boolean).join(' · '))
      .join(' / ')}${cands.length > 4 ? '…' : ''}`;
  }
  return nota;
}

export async function fetchResumenClasificaciones(
  equipos: EquipoLike[],
  categorias: CategoriaLike[]
): Promise<ClasifCategoriaResumen[]> {
  const order = [
    ...categorias.map(c => c.nombre),
    ...[...new Set(equipos.map(e => e.categoria))].filter(
      c => !categorias.some(x => x.nombre === c)
    )
  ];
  const groups = order
    .map(cat => ({
      categoria: cat,
      equipos: equipos
        .filter(e => e.categoria === cat)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    }))
    .filter(g => g.equipos.length > 0);

  const pairs = groups.flatMap(g => g.equipos.map(e => ({ categoria: g.categoria, equipo: e })));
  const results = await runPool(pairs, 4, async ({ equipo }) => {
    const meta = [equipo.division, equipo.grupo].filter(Boolean).join(' · ');
    const origen = ffcvParamsDeEquipo(equipo);
    if (!origen) {
      return {
        estado: 'sin-link' as EstadoClasif,
        meta,
        title: '',
        sub: '',
        rows: [] as FfcvStandingsRow[],
        updatedAt: '',
        nota: NOTAS_ERROR.sin_datos_equipo
      };
    }
    try {
      const data =
        origen.tipo === 'link'
          ? await fetchFfcvClasificacionLinkCached(origen.url)
          : await fetchFfcvClasificacionGrupoCached(origen.params);
      const j = data.jornada.trim();
      return {
        estado: 'ok' as EstadoClasif,
        meta,
        title: [data.competicion, data.grupo].filter(Boolean).join(' · '),
        sub: [j ? (/jornada/i.test(j) ? j : `Jornada ${j}`) : '', data.fecha.trim()]
          .filter(Boolean)
          .join(' · '),
        rows: data.rows,
        updatedAt: data.updatedAt
      };
    } catch (err) {
      return {
        estado: 'error' as EstadoClasif,
        meta,
        title: '',
        sub: '',
        rows: [] as FfcvStandingsRow[],
        updatedAt: '',
        nota: notaDeError(err)
      };
    }
  });

  const byCat = new Map<string, ClasifTeamResumen[]>();
  pairs.forEach((p, i) => {
    const r = results[i];
    const list = byCat.get(p.categoria) || [];
    list.push({
      nombre: p.equipo.nombre,
      meta: r.meta,
      estado: r.estado,
      title: r.title,
      sub: r.sub,
      rows: r.rows,
      updatedAt: r.updatedAt,
      nota: r.nota
    });
    byCat.set(p.categoria, list);
  });
  return groups.map(g => ({ categoria: g.categoria, equipos: byCat.get(g.categoria) || [] }));
}
