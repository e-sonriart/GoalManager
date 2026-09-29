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
  racha: string[];
}

export interface FfcvClasificacion {
  competicion: string;
  grupo: string;
  jornada: string;
  fecha: string;
  rows: FfcvStandingsRow[];
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
    rows: data.rows as FfcvStandingsRow[]
  };
}
