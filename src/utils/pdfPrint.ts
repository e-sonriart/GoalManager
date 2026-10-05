export interface PdfSeccion {
  titulo: string;
  columnas: string[];
  filas: (string | number)[][];
}

export interface PdfDatos {
  titulo: string;
  subtitulo?: string;
  meta?: string;
  secciones: PdfSeccion[];
}

export const pdfFechaCorta = (fecha?: string): string => {
  if (!fecha) return '';
  const d = new Date(`${fecha}T00:00:00`);
  if (isNaN(d.getTime())) return fecha;
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  return `${dias[d.getDay()]} ${dd}/${mm}/${yy}`;
};

export const pdfEstadoPartido = (p: { finalizado?: boolean | string; golesLocal?: number | string | null; golesVisitante?: number | string | null; suspendido?: boolean | string }): string => {
  const fin = p.finalizado === true || p.finalizado === 'true';
  const hayMarcador = p.golesLocal !== undefined && p.golesLocal !== null && p.golesLocal !== '' && p.golesVisitante !== undefined && p.golesVisitante !== null && p.golesVisitante !== '';
  if (fin && hayMarcador) return `${p.golesLocal} - ${p.golesVisitante}`;
  if (p.suspendido === true || p.suspendido === 'true') return 'Suspendido';
  return 'Por jugar';
};

export const pdfEdad = (fechaNacimiento?: string): string => {
  if (!fechaNacimiento) return '-';
  const n = new Date(`${fechaNacimiento}T00:00:00`);
  if (isNaN(n.getTime())) return '-';
  const hoy = new Date();
  let edad = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--;
  return edad >= 0 ? String(edad) : '-';
};

// ---------------------------------------------------------------- motor PDF
// Escritor mínimo de PDF 1.4 (A4, Helvetica, multi-página). Todo el contenido
// se serializa en Latin-1 (1 byte por carácter) para calcular offsets exactos.

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const TOP_Y = 46; // primer elemento desde arriba
const BOTTOM_LIMIT = 786; // nada por debajo (deja sitio al pie)

const COLOR = {
  naranja: '0.976 0.451 0.086',
  oscuro: '0.067 0.094 0.153',
  texto: '0.106 0.122 0.145',
  gris: '0.42 0.447 0.5',
  grisClaro: '0.898 0.906 0.922',
  fila: '0.976 0.98 0.984',
  meta: '1 0.969 0.929',
  blanco: '1 1 1'
};

const esc = (s: string): string => {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0) || 0;
    if (ch === '\\' || ch === '(' || ch === ')') out += '\\' + ch;
    else if (c >= 32 && c <= 126) out += ch;
    else if (c <= 0xff) out += '\\' + c.toString(8).padStart(3, '0');
    else out += '?';
  }
  return out;
};

const medir = (s: string, size: number, bold: boolean): number => s.length * size * (bold ? 0.54 : 0.5);

const envolver = (s: string, maxW: number, size: number, bold: boolean): string[] => {
  const palabras = String(s ?? '').split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let act = '';
  for (const p of palabras) {
    const cand = act ? `${act} ${p}` : p;
    if (!act || medir(cand, size, bold) <= maxW) act = cand;
    else {
      lineas.push(act);
      act = p;
    }
  }
  if (act) lineas.push(act);
  return lineas.length ? lineas : [''];
};

// yTop: distancia desde el borde superior → coordenada PDF (origen abajo-izquierda)
const yPos = (yTop: number, alto = 0): number => PAGE_H - yTop - alto;

const txt = (x: number, yTop: number, size: number, bold: boolean, gris: boolean, s: string): string =>
  `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${gris ? COLOR.gris : COLOR.texto} rg ${x.toFixed(2)} ${yPos(yTop, size * 0.8).toFixed(2)} Td (${esc(s)}) Tj ET`;

const rect = (x: number, yTop: number, w: number, h: number, color: string): string =>
  `${color} rg ${x.toFixed(2)} ${yPos(yTop, h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`;

const rectBorde = (x: number, yTop: number, w: number, h: number): string =>
  `${COLOR.grisClaro} RG 0.5 w ${x.toFixed(2)} ${yPos(yTop, h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`;

const linea = (x1: number, y1Top: number, x2: number, y2Top: number): string =>
  `${COLOR.grisClaro} RG 0.5 w ${x1.toFixed(2)} ${yPos(y1Top).toFixed(2)} m ${x2.toFixed(2)} ${yPos(y2Top).toFixed(2)} l S`;

export const construirPdf = (d: PdfDatos): Uint8Array => {
  const paginas: string[][] = [];
  let ops: string[] = [];
  let y = TOP_Y;

  const cerrarPagina = () => {
    // Pie de página
    ops.push(linea(MARGIN, PAGE_H - 30, PAGE_W - MARGIN, PAGE_H - 30));
    ops.push(
      txt(MARGIN, PAGE_H - 24, 7.5, false, true, `Generado por GoalManager · ${new Date().toLocaleString('es-ES')}`)
    );
    paginas.push(ops);
    ops = [];
  };

  const barraSuperior = () => {
    ops.push(rect(0, 0, PAGE_W, 4, COLOR.naranja));
  };

  const nuevaPagina = (continuacion: boolean) => {
    if (ops.length || paginas.length === 0) cerrarPagina();
    barraSuperior();
    y = TOP_Y;
    if (continuacion) {
      ops.push(txt(MARGIN, y, 9, true, true, `${d.titulo} (continuación)`));
      y += 16;
      ops.push(linea(MARGIN, y, PAGE_W - MARGIN, y));
      y += 10;
    }
  };

  barraSuperior();
  // Cabecera (solo primera página)
  ops.push(txt(MARGIN, y, 17, true, false, d.titulo));
  y += 24;
  if (d.subtitulo) {
    ops.push(txt(MARGIN, y, 10, false, true, d.subtitulo));
    y += 16;
  }
  if (d.meta) {
    ops.push(rect(MARGIN, y, CONTENT_W, 20, COLOR.meta));
    ops.push(txt(MARGIN + 8, y + 5.5, 8.5, false, false, d.meta));
    y += 30;
  } else {
    y += 8;
  }

  const dibujarThead = (s: PdfSeccion): number => {
    const n = Math.max(s.columnas.length, 1);
    const anchoC = CONTENT_W / n;
    const padX = 4;
    let hMax = 0;
    s.columnas.forEach((c, i) => {
      const l = envolver(String(c), anchoC - padX * 2, 7.5, true);
      hMax = Math.max(hMax, l.length);
    });
    const h = hMax * 9 + 8;
    ops.push(rect(MARGIN, y, CONTENT_W, h, COLOR.oscuro));
    s.columnas.forEach((c, i) => {
      const l = envolver(String(c), anchoC - padX * 2, 7.5, true);
      l.forEach((lineaTxt, li) => {
        ops.push(`BT /F2 7.5 Tf ${COLOR.blanco} rg ${(MARGIN + i * anchoC + padX).toFixed(2)} ${yPos(y + 4 + li * 9, 6).toFixed(2)} Td (${esc(lineaTxt)}) Tj ET`);
      });
    });
    return h;
  };

  for (const s of d.secciones) {
    if (!s.filas.length) continue;
    y += 6;
    if (y + 34 > BOTTOM_LIMIT) nuevaPagina(true);
    ops.push(txt(MARGIN, y, 11, true, false, s.titulo));
    y += 15;
    ops.push(linea(MARGIN, y, PAGE_W - MARGIN, y));
    y += 6;

    y += dibujarThead(s);

    const n = Math.max(s.columnas.length, 1);
    const anchoC = CONTENT_W / n;
    const padX = 4;
    const padY = 4;
    const lh = 10;

    s.filas.forEach((fila, idx) => {
      const celdas: string[][] = fila.map((c, i) => envolver(String(c ?? ''), anchoC - padX * 2, 8.5, false));
      const lineasMax = Math.max(...celdas.map(c => c.length), 1);
      const h = lineasMax * lh + padY * 2 + 1;

      if (y + h > BOTTOM_LIMIT) {
        nuevaPagina(true);
        y += dibujarThead(s);
      }

      if (idx % 2 === 1) ops.push(rect(MARGIN, y, CONTENT_W, h, COLOR.fila));
      celdas.forEach((c, i) => {
        c.forEach((lineaTxt, li) => {
          ops.push(txt(MARGIN + i * anchoC + padX, y + padY + li * lh, 8.5, false, false, lineaTxt));
        });
        ops.push(rectBorde(MARGIN + i * anchoC, y, anchoC, h));
      });
      y += h;
    });
    y += 10;
  }

  if (!paginas.length || ops.length) cerrarPagina();

  // ---- serialización de objetos ----
  const objetos: string[] = []; // índice 0 = objeto 1
  const kids: number[] = [];
  let next = 5;
  for (let i = 0; i < paginas.length; i++) {
    const pageObj = next;
    const contObj = next + 1;
    next += 2;
    kids.push(pageObj);
    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contObj} 0 R >>`
    );
    const stream = paginas[i].join('\n');
    objetos.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  const objs: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${paginas.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    ...objetos
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
};

// Abre el PDF directamente en una pestaña del navegador (visor de PDF integrado).
export const abrirPdf = (d: PdfDatos): boolean => {
  if (!d.secciones.some(s => s.filas.length)) return false;
  try {
    const bytes = construirPdf(d);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${d.titulo.replace(/[^\w -]/g, '_').trim() || 'documento'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 300000);
    return true;
  } catch {
    return false;
  }
};
