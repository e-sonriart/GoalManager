/**
 * Extracción de la clasificación oficial FFCV vía proxy serverless
 * (/api/clasificacion), que devuelve filas normalizadas.
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

export async function fetchFfcvClasificacion(url: string): Promise<FfcvClasificacion> {
  const res = await fetch(`/api/clasificacion?url=${encodeURIComponent(url)}`);
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data?.ok || !Array.isArray(data.rows) || !data.rows.length) {
    throw new Error(String(data?.error || `HTTP ${res.status}`));
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

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { ts: number; data: FfcvClasificacion | null }>();

async function fetchFfcvClasificacionCached(url: string): Promise<FfcvClasificacion> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    if (hit.data) return hit.data;
    throw new Error('error_extraccion');
  }
  try {
    const data = await fetchFfcvClasificacion(url);
    cache.set(url, { ts: Date.now(), data });
    return data;
  } catch (e) {
    cache.set(url, { ts: Date.now(), data: null });
    throw e;
  }
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
}

export interface ClasifCategoriaResumen {
  categoria: string;
  equipos: ClasifTeamResumen[];
}

interface EquipoLike {
  nombre: string;
  categoria: string;
  division?: string;
  grupo?: string;
  linkClasificacion?: string;
}

interface CategoriaLike {
  nombre: string;
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
    const link = equipo.linkClasificacion?.trim();
    if (!link) {
      return {
        estado: 'sin-link' as EstadoClasif,
        meta,
        title: '',
        sub: '',
        rows: [] as FfcvStandingsRow[],
        updatedAt: ''
      };
    }
    try {
      const data = await fetchFfcvClasificacionCached(link);
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
    } catch {
      return {
        estado: 'error' as EstadoClasif,
        meta,
        title: '',
        sub: '',
        rows: [] as FfcvStandingsRow[],
        updatedAt: ''
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
      updatedAt: r.updatedAt
    });
    byCat.set(p.categoria, list);
  });
  return groups.map(g => ({ categoria: g.categoria, equipos: byCat.get(g.categoria) || [] }));
}
