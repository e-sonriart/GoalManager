import { Partido } from '../types';
import { isPartidoSuspendido } from './partidoEstado';

export interface PdfSeccion {
  titulo: string;
  columnas: string[];
  filas: (string | number)[][];
}

export interface PdfDatos {
  titulo: string;
  /** Cabecera: nombre del club y temporada. */
  subtitulo?: string;
  /** Filtros aplicados en pantalla (se muestra en una banda destacada). */
  meta?: string;
  secciones: PdfSeccion[];
}

/** Fecha corta legible para tablas: "sáb 04/10/26". */
export const pdfFechaCorta = (fecha?: string): string => {
  const raw = (fecha || '').slice(0, 10);
  if (!raw) return '';
  const d = new Date(`${raw}T12:00:00`);
  return isNaN(d.getTime())
    ? fecha || ''
    : d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' });
};

/** Estado del partido para la última columna: marcador, Suspendido o Por jugar. */
export const pdfEstadoPartido = (p: Partido): string => {
  if (p.finalizado) return `${p.golesLocal ?? 0} - ${p.golesVisitante ?? 0}`;
  if (isPartidoSuspendido(p)) return 'Suspendido';
  return 'Por jugar';
};

/** Edad en años a partir de la fecha de nacimiento (vacío si no hay fecha válida). */
export const pdfEdad = (fechaNacimiento?: string): string => {
  const raw = (fechaNacimiento || '').slice(0, 10);
  if (!raw) return '';
  const n = new Date(`${raw}T12:00:00`);
  if (isNaN(n.getTime())) return '';
  const hoy = new Date();
  let edad = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--;
  return edad >= 0 && edad < 120 ? String(edad) : '';
};

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Genera un documento (A4) y abre el diálogo de impresión del navegador —
 * elegir "Guardar como PDF" para descargar. Devuelve false si no hay filas.
 */
export const imprimirPdf = (datos: PdfDatos): boolean => {
  const conFilas = datos.secciones.filter(s => s.filas.length > 0);
  if (conFilas.length === 0) return false;
  if (typeof document === 'undefined') return false;

  const ahora = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const seccionesHtml = conFilas
    .map(
      sec => `<h2>${esc(sec.titulo)} <span class="n">${sec.filas.length}</span></h2>
    <table>
      <thead><tr>${sec.columnas.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${sec.filas.map(f => `<tr>${f.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${esc(datos.titulo)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #111827; margin: 0; font-size: 11px; }
  header { display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; border-bottom: 3px solid #f97316; padding-bottom: 8px; margin-bottom: 12px; }
  h1 { font-size: 17px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: .02em; }
  .sub { color: #6b7280; font-size: 10.5px; }
  .der { text-align: right; color: #6b7280; font-size: 9.5px; white-space: nowrap; }
  .meta { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; border-radius: 6px; padding: 5px 9px; font-size: 9.5px; margin-bottom: 10px; }
  h2 { font-size: 11px; background: #f3f4f6; border: 1px solid #e5e7eb; padding: 5px 8px; margin: 14px 0 0; border-radius: 5px 5px 0 0; text-transform: uppercase; }
  h2 .n { color: #9ca3af; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #e5e7eb; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #111827; color: #fff; font-size: 8.5px; text-transform: uppercase; letter-spacing: .04em; }
  tbody tr:nth-child(even) td { background: #f9fafb; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  footer { margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 6px; color: #9ca3af; font-size: 8.5px; text-align: right; }
</style>
</head>
<body>
  <header>
    <div>
      <h1>${esc(datos.titulo)}</h1>
      ${datos.subtitulo ? `<div class="sub">${esc(datos.subtitulo)}</div>` : ''}
    </div>
    <div class="der">${ahora}</div>
  </header>
  ${datos.meta ? `<div class="meta">${esc(datos.meta)}</div>` : ''}
  ${seccionesHtml}
  <footer>Generado por GoalManager · ${ahora}</footer>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const lanzar = () => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
    }
  };
  if (doc.readyState === 'complete') setTimeout(lanzar, 300);
  else win.addEventListener('load', () => setTimeout(lanzar, 300));

  return true;
};
