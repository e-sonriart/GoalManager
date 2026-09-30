import { CategoryStandings } from './standings';
import { ClasifCategoriaResumen, FfcvStandingsRow } from './ffcvClasificacion';

const esc = (v: string): string =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtDif = (n: number): string => (n > 0 ? `+${n}` : `${n}`);

const POPUP_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #111827; }
  header { background: #030712; color: #fff; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  header h1 { margin: 0; font-size: 17px; text-transform: uppercase; letter-spacing: .04em; }
  header .temp { color: #fb923c; font-weight: 700; font-size: 12px; text-align: right; }
  main { padding: 16px; max-width: 960px; margin: 0 auto; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .06em; margin: 18px 0 8px; display: flex; align-items: center; gap: 8px; color: #111827; }
  h2 small { color: #9ca3af; font-weight: 500; text-transform: none; letter-spacing: 0; }
  .dot { width: 6px; height: 18px; border-radius: 999px; background: #10b981; display: inline-block; }
  .table-wrap { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 540px; }
  thead th { background: #f9fafb; color: #6b7280; font-size: 11px; text-transform: uppercase; padding: 8px 6px; }
  th.team, td.team { text-align: left; }
  td { padding: 8px 6px; text-align: center; border-top: 1px solid #f3f4f6; }
  tr.club td { background: #ecfdf5; }
  tr.club td.team { font-weight: 700; color: #065f46; }
  td.pos span { display: inline-flex; min-width: 20px; height: 20px; align-items: center; justify-content: center; border-radius: 6px; background: #f3f4f6; color: #4b5563; font-size: 11px; font-weight: 700; padding: 0 4px; }
  td.pos span.first { background: #fef3c7; color: #92400e; }
  td.pts { font-weight: 800; }
  .empty { background: #fff; border: 1px dashed #e5e7eb; border-radius: 12px; padding: 40px 20px; text-align: center; color: #6b7280; font-size: 14px; }
  footer { color: #9ca3af; font-size: 11px; text-align: center; padding: 10px 16px 24px; }
`;

function writePopup(title: string, body: string): void {
  const win = window.open(
    '',
    '_blank',
    'width=840,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes'
  );
  if (!win) {
    window.alert(
      'El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para abrir la clasificación.'
    );
    return;
  }
  win.document.open();
  win.document.write(body);
  win.document.close();
  win.focus();
}

const normKey = (s: string): string =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

export interface StandingsPopupOptions {
  /** Filtra una sola categoría (p. ej. la del equipo abierto) */
  categoria?: string;
  clubName?: string;
  temporada?: string;
  /** Título extra mostrado en la cabecera (p. ej. nombre del equipo) */
  equipo?: string;
}

/**
 * Abre la clasificación en una ventana emergente con HTML autónomo
 * (sin cargar la aplicación ni ningún recurso externo).
 */
export function openStandingsPopup(
  standings: CategoryStandings[],
  clubTeams: Set<string>,
  options: StandingsPopupOptions = {}
): void {
  const cats = options.categoria
    ? standings.filter(s => s.categoria.toLowerCase() === options.categoria!.toLowerCase())
    : standings;
  const club = options.clubName || 'Club';
  const temporada = options.temporada || '';

  const sections = cats.length
    ? cats
        .map(
          ({ categoria, rows }) => `
      <section>
        <h2><span class="dot"></span>${esc(categoria)} <small>${rows.length} equipos</small></h2>
        <div class="table-wrap">
        <table>
          <thead>
            <tr><th class="pos">#</th><th class="team">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr>
          </thead>
          <tbody>
            ${rows
              .map((r, i) => {
                const isClub = clubTeams.has(r.equipo.toLowerCase().trim());
                return `<tr class="${isClub ? 'club' : ''}">
                  <td class="pos"><span class="${i === 0 ? 'first' : ''}">${i + 1}</span></td>
                  <td class="team">${esc(r.equipo)}</td>
                  <td>${r.jugados}</td>
                  <td>${r.ganados}</td>
                  <td>${r.empatados}</td>
                  <td>${r.perdidos}</td>
                  <td>${r.gf}</td>
                  <td>${r.gc}</td>
                  <td>${fmtDif(r.dif)}</td>
                  <td class="pts">${r.puntos}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
        </div>
      </section>`
        )
        .join('')
    : `<div class="empty">Todavía no hay resultados finalizados: la clasificación aparecerá cuando se registren partidos.</div>`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Clasificación${options.equipo ? ` · ${esc(options.equipo)}` : ''} — ${esc(club)}</title>
<style>${POPUP_CSS}</style>
</head>
<body>
<header>
  <h1>Clasificación${options.equipo ? ` · ${esc(options.equipo)}` : ''}</h1>
  <div class="temp">${esc(club)}${temporada ? `<br />${esc(temporada)}` : ''}</div>
</header>
<main>${sections}</main>
<footer>Generado el ${new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })} · ${esc(club)}</footer>
</body>
</html>`;

  writePopup(`Clasificación${options.equipo ? ` · ${esc(options.equipo)}` : ''} — ${esc(club)}`, html);
}

const RACHA_COLORS: Record<string, string> = { G: '#04B431', E: '#D7DF01', P: '#F78181' };

const ZONE_COLORS: Record<string, string> = { '#1dff46': 'Ascenso', '#ff1622': 'Descenso' };

const FFCV_EXTRA_CSS = `
  .racha { display: inline-flex; gap: 3px; justify-content: center; }
  .racha span { width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 700; }
  .club-name { display: inline-flex; align-items: center; gap: 8px; }
  .shield { width: 22px; height: 22px; object-fit: contain; flex-shrink: 0; }
  .legend { margin-top: 12px; padding: 14px 16px; background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 12px; }
  .legend strong { display: block; text-transform: uppercase; font-size: 11px; color: #6b7280; margin-bottom: 8px; }
  .legend-item { display: inline-flex; align-items: center; gap: 6px; margin-right: 16px; font-weight: 500; }
  .swatch { width: 14px; height: 14px; border-radius: 3px; display: inline-block; }
  .team-block { margin-bottom: 14px; }
  .team-title { font-size: 12px; font-weight: 700; margin-bottom: 6px; display: flex; gap: 8px; flex-wrap: wrap; align-items: baseline; }
  .team-title .league { color: #9ca3af; font-weight: 500; font-size: 11px; }
  .note { background: #fff; border: 1px dashed #e5e7eb; border-radius: 12px; padding: 12px; color: #6b7280; font-size: 12px; font-style: italic; }
`;

const FFCV_HEAD = `<tr><th class="pos">Pos</th><th class="team">Equipo</th><th>Pts</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>Racha</th></tr>`;

function makeIsOurs(highlightNames: string[]): (name: string) => boolean {
  const highlights = highlightNames.map(normKey).filter(k => k.length >= 4);
  return (name: string): boolean => {
    const k = normKey(name);
    if (!k) return false;
    return highlights.some(h => k === h || k.includes(h) || h.includes(k));
  };
}

function ffcvRowHtml(r: FfcvStandingsRow, isClub: boolean): string {
  const zone = (r.color || '').trim().toLowerCase();
  const posStyle = ZONE_COLORS[zone] ? ` style="border-left:4px solid ${zone}"` : '';
  const shield = r.img
    ? `<img class="shield" src="https://appwebffcv.novanet.es${esc(r.img)}" alt="" onerror="this.style.display='none'" />`
    : '';
  const racha = r.racha
    .map(t => `<span style="background-color:${RACHA_COLORS[t] || '#6b7280'}">${esc(t)}</span>`)
    .join('');
  const first = r.pos.trim() === '1' ? ' first' : '';
  return `<tr class="${isClub ? 'club' : ''}">
    <td class="pos"${posStyle}><span class="${first.trim()}">${esc(r.pos)}</span></td>
    <td class="team"><span class="club-name">${shield}${esc(r.equipo)}</span></td>
    <td class="pts">${esc(r.pts)}</td>
    <td>${esc(r.pj)}</td>
    <td>${esc(r.g)}</td>
    <td>${esc(r.e)}</td>
    <td>${esc(r.p)}</td>
    <td>${esc(r.gf)}</td>
    <td>${esc(r.gc)}</td>
    <td>${racha ? `<span class="racha">${racha}</span>` : ''}</td>
  </tr>`;
}

function ffcvTableHtml(rows: FfcvStandingsRow[], isClubRow: (r: FfcvStandingsRow) => boolean): string {
  return `<div class="table-wrap">
    <table>
      <thead>${FFCV_HEAD}</thead>
      <tbody>${rows.map(r => ffcvRowHtml(r, isClubRow(r))).join('')}</tbody>
    </table>
  </div>`;
}

function ffcvLegendHtml(rows: FfcvStandingsRow[]): string {
  const items = Object.entries(ZONE_COLORS)
    .filter(([hex]) => rows.some(r => (r.color || '').trim().toLowerCase() === hex))
    .map(
      ([hex, label]) =>
        `<span class="legend-item"><span class="swatch" style="background:${hex}"></span>${label}</span>`
    )
    .join('');
  return items ? `<div class="legend"><strong>Leyenda</strong><div>${items}</div></div>` : '';
}

export interface FfcvStandingsPopupOptions {
  title: string;
  subtitle?: string;
  rows: FfcvStandingsRow[];
  /** Nombres de equipos del club a resaltar (coincidencia flexible) */
  highlightNames: string[];
  clubName?: string;
  temporada?: string;
  /** ISO de la última actualización de los datos (caché serverless) */
  updatedAt?: string;
}

const fmtUpdatedAt = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function openFfcvStandingsPopup(options: FfcvStandingsPopupOptions): void {
  const club = options.clubName || 'Club';
  const isOurs = makeIsOurs(options.highlightNames);
  const sub = options.subtitle || '';
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(options.title)} — ${esc(club)}</title>
<style>${POPUP_CSS}${FFCV_EXTRA_CSS}</style>
</head>
<body>
<header>
  <h1>${esc(options.title)}</h1>
  <div class="temp">${esc(sub || club)}${sub ? `<br />${esc(club)}` : ''}</div>
</header>
<main>
  <section>
    <h2><span class="dot"></span>Clasificación oficial FFCV <small>${options.rows.length} equipos</small></h2>
    ${ffcvTableHtml(options.rows, r => isOurs(r.equipo))}
    ${ffcvLegendHtml(options.rows)}
  </section>
</main>
<footer>Fuente: FFCV · ${
    fmtUpdatedAt(options.updatedAt)
      ? `datos actualizados el ${fmtUpdatedAt(options.updatedAt)}`
      : `extraído el ${new Date().toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })}`
  } · ${esc(club)}</footer>
</body>
</html>`;

  writePopup(`${options.title} — ${club}`, html);
}

export interface ResumenClasificacionesOptions {
  sections: ClasifCategoriaResumen[];
  highlightNames: string[];
  clubName?: string;
  temporada?: string;
}

export function openResumenClasificacionesPopup(options: ResumenClasificacionesOptions): void {
  const club = options.clubName || 'Club';
  const temporada = options.temporada || '';
  const isOurs = makeIsOurs(options.highlightNames);

  const sections = options.sections
    .map(({ categoria, equipos }) => {
      const blocks = equipos
        .map(t => {
          const meta = t.meta ? ` <span class="league">${esc(t.meta)}</span>` : '';
          if (t.estado === 'sin-link') {
            return `<div class="team-block">
              <div class="team-title">${esc(t.nombre)}${meta}</div>
              <div class="note">Sin link de clasificación.</div>
            </div>`;
          }
          if (t.estado === 'error') {
            return `<div class="team-block">
              <div class="team-title">${esc(t.nombre)}${meta}</div>
              <div class="note">No se pudo extraer la clasificación de la FFCV.</div>
            </div>`;
          }
          const idx = t.rows.findIndex(r => isOurs(r.equipo));
          const slice = idx >= 0 ? t.rows.slice(Math.max(0, idx - 1), idx + 2) : t.rows;
          const league = t.title ? ` <span class="league">${esc(t.title)}</span>` : '';
          const sub = t.sub ? ` <span class="league">${esc(t.sub)}</span>` : '';
          const act = fmtUpdatedAt(t.updatedAt)
            ? ` <span class="league">Actualizado: ${esc(fmtUpdatedAt(t.updatedAt))}</span>`
            : '';
          return `<div class="team-block">
            <div class="team-title">${esc(t.nombre)}${meta}${league}${sub}${act}</div>
            ${ffcvTableHtml(slice, r => isOurs(r.equipo))}
          </div>`;
        })
        .join('');
      return `<section>
        <h2><span class="dot"></span>${esc(categoria)} <small>${equipos.length} ${
        equipos.length === 1 ? 'equipo' : 'equipos'
      }</small></h2>
        ${blocks}
      </section>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Clasificaciones — ${esc(club)}</title>
<style>${POPUP_CSS}${FFCV_EXTRA_CSS}</style>
</head>
<body>
<header>
  <h1>Clasificaciones del Club</h1>
  <div class="temp">${esc(club)}${temporada ? `<br />${esc(temporada)}` : ''}</div>
</header>
<main>${sections}</main>
<footer>Fuente: FFCV · tu equipo con sus vecinos de clasificación · actualización automática cada lunes · ${esc(
    club
  )}</footer>
</body>
</html>`;

  writePopup(`Clasificaciones — ${club}`, html);
}
