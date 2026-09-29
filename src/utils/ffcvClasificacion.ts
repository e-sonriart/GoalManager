/**
 * Extracción de la clasificación oficial FFCV a partir del HTML de
 * clasificaciones_html.php (proxy serverless en /api/clasificacion).
 */

export interface FfcvParsedTable {
  headers: string[];
  rows: string[][];
  teamNames: string[];
}

export interface FfcvClasificacion {
  competicion: string;
  grupo: string;
  jornada: string;
  table: FfcvParsedTable;
}

const clean = (s: string): string => s.replace(/\s+/g, ' ').trim();

export function parseClasifHtml(html: string): FfcvParsedTable {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let headers = Array.from(doc.querySelectorAll('thead th'))
    .map(th => clean(th.textContent || ''))
    .filter(Boolean);
  const trs = Array.from(doc.querySelectorAll('tbody tr'));
  const rows: string[][] = [];
  const teamNames: string[] = [];
  for (const tr of trs) {
    const tds = Array.from(tr.querySelectorAll('td'));
    if (!tds.length) continue;
    rows.push(tds.map(td => clean(td.textContent || '')));
    const span = tr.querySelector('.table-club-name span');
    const cell = span || tds[1] || tds[0];
    teamNames.push(clean((cell && cell.textContent) || ''));
  }
  if (!headers.length && rows.length) {
    headers = ['Pos', 'Equipo', ...rows[0].slice(2).map((_, i) => `Col ${i + 1}`)];
  }
  return { headers, rows, teamNames };
}

export async function fetchFfcvClasificacion(url: string): Promise<FfcvClasificacion> {
  const res = await fetch(`/api/clasificacion?url=${encodeURIComponent(url)}`);
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data?.ok || !data.html) {
    throw new Error(String(data?.error || `HTTP ${res.status}`));
  }
  const table = parseClasifHtml(String(data.html));
  if (!table.rows.length) throw new Error('tabla_vacia');
  return {
    competicion: String(data.competicion || ''),
    grupo: String(data.grupo || ''),
    jornada: String(data.jornada || ''),
    table
  };
}
