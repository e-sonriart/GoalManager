import { CategoryStandings } from './standings';

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

export interface FfcvStandingsPopupOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  teamNames: string[];
  /** Nombres de equipos del club a resaltar (coincidencia flexible) */
  highlightNames: string[];
  clubName?: string;
  temporada?: string;
}

export function openFfcvStandingsPopup(options: FfcvStandingsPopupOptions): void {
  const club = options.clubName || 'Club';
  const highlights = options.highlightNames.map(normKey).filter(k => k.length >= 4);
  const isOurs = (name: string): boolean => {
    const k = normKey(name);
    if (!k) return false;
    return highlights.some(h => k === h || k.includes(h) || h.includes(k));
  };
  const headers = options.headers;
  const teamCol = Math.max(1, headers.findIndex(h => /equipo|club|team/i.test(h)));
  const clsFor = (ci: number): string =>
    ci === 0 ? 'pos' : ci === teamCol ? 'team' : ci === headers.length - 1 ? 'pts' : '';

  const head = `<tr>${headers
    .map((h, i) => `<th class="${clsFor(i)}">${esc(h)}</th>`)
    .join('')}</tr>`;

  const body = options.rows
    .map((cells, i) => {
      const name = options.teamNames[i] || cells[teamCol] || '';
      const ours = isOurs(name);
      const tds = cells
        .map((c, ci) => {
          const cls = clsFor(ci);
          const inner =
            ci === 0 ? `<span class="${i === 0 ? 'first' : ''}">${esc(c)}</span>` : esc(c);
          return `<td class="${cls}">${inner}</td>`;
        })
        .join('');
      return `<tr class="${ours ? 'club' : ''}">${tds}</tr>`;
    })
    .join('');

  const jornada = options.subtitle || '';
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(options.title)} — ${esc(club)}</title>
<style>${POPUP_CSS}</style>
</head>
<body>
<header>
  <h1>${esc(options.title)}</h1>
  <div class="temp">${esc(jornada || club)}${jornada ? `<br />${esc(club)}` : ''}</div>
</header>
<main>
  <section>
    <h2><span class="dot"></span>Clasificación oficial <small>${options.rows.length} equipos</small></h2>
    <div class="table-wrap">
      <table>
        <thead>${head}</thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  </section>
</main>
<footer>Fuente: FFCV · extraído el ${new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })} · ${esc(club)}</footer>
</body>
</html>`;

  writePopup(`${options.title} — ${club}`, html);
}
