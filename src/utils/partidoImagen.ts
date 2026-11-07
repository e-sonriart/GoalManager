import type { Partido } from '../types';

/**
 * Genera una imagen vertical (1080 × 1350) con el resumen del partido:
 * fecha y hora arriba, escudos grandes y marcador en el centro.
 * Se dibuja en un canvas para poder descargarla o compartirla por WhatsApp.
 */

export interface DatosImagenPartido {
  escudoLocal: string;
  escudoVisitante: string;
  /** Marcador. Si se omite, se muestra «VS». */
  golesLocal?: number;
  golesVisitante?: number;
  clubName?: string;
  temporada?: string;
}

const ANCHO = 1080;
const ALTO = 1350;
const FUENTE = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';

const fechaLarga = (fecha: string): string => {
  const base = (fecha || '').slice(0, 10);
  const d = new Date(`${base}T12:00:00`);
  if (isNaN(d.getTime())) return fecha || '';
  const texto = d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const horaCorta = (partido: Partido): string => {
  if (partido.hora && partido.hora.length >= 5) return partido.hora.slice(0, 5);
  const fecha = String(partido.fecha || '');
  if (fecha.includes('T') && fecha.length >= 16) return fecha.slice(11, 16);
  return '';
};

const redondear = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radio = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.arcTo(x + w, y, x + w, y + h, radio);
  ctx.arcTo(x + w, y + h, x, y + h, radio);
  ctx.arcTo(x, y + h, x, y, radio);
  ctx.arcTo(x, y, x + w, y, radio);
  ctx.closePath();
};

const iniciales = (nombre: string): string => {
  const limpio = (nombre || '')
    .replace(/^(club|c\.d\.|cd|u\.d\.|ud|f\.c\.|fc)\s+/i, '')
    .trim();
  const palabras = limpio.split(/\s+/).filter(Boolean);
  if (palabras.length >= 2) return (palabras[0][0] + palabras[1][0]).toUpperCase();
  return (nombre || 'CF').slice(0, 2).toUpperCase();
};

const paletaEquipo = (nombre: string): [string, string] => {
  const paletas: Array<[string, string]> = [
    ['#f97316', '#c2410c'],
    ['#3b82f6', '#1e40af'],
    ['#10b981', '#047857'],
    ['#ef4444', '#9f1239'],
    ['#8b5cf6', '#5b21b6'],
    ['#06b6d4', '#0e7490']
  ];
  let hash = 0;
  const texto = (nombre || '').toLowerCase();
  for (let i = 0; i < texto.length; i++) {
    hash = texto.charCodeAt(i) + ((hash << 5) - hash);
  }
  return paletas[Math.abs(hash) % paletas.length];
};

const cargarImagen = (src: string): Promise<HTMLImageElement | null> =>
  new Promise(resolve => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = src;
    // Respaldo por si el navegador no dispara onload/onerror (red colgada).
    window.setTimeout(() => resolve(img.naturalWidth > 0 ? img : null), 8000);
  });

const dibujarEscudo = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  nombre: string,
  cx: number,
  cy: number,
  tamano: number
) => {
  const x = cx - tamano / 2;
  const y = cy - tamano / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 16;
  redondear(ctx, x, y, tamano, tamano, tamano * 0.17);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
  ctx.fill();
  ctx.restore();

  if (img) {
    const margen = tamano * 0.13;
    const maxW = tamano - margen * 2;
    const maxH = tamano - margen * 2;
    const escala = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
    const w = img.naturalWidth * escala;
    const h = img.naturalHeight * escala;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    return;
  }

  const [c1, c2] = paletaEquipo(nombre);
  const degradado = ctx.createLinearGradient(x, y, x + tamano, y + tamano);
  degradado.addColorStop(0, c1);
  degradado.addColorStop(1, c2);
  redondear(ctx, x + tamano * 0.16, y + tamano * 0.16, tamano * 0.68, tamano * 0.68, tamano * 0.12);
  ctx.fillStyle = degradado;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${tamano * 0.24}px ${FUENTE}`;
  ctx.fillText(iniciales(nombre), cx, cy + tamano * 0.02);
};

const dibujarNombre = (
  ctx: CanvasRenderingContext2D,
  nombre: string,
  cx: number,
  y: number,
  anchoMax: number
) => {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 34px ${FUENTE}`;

  const palabras = (nombre || '').toUpperCase().split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of palabras) {
    const siguiente = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(siguiente).width > anchoMax && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = siguiente;
    }
  }
  if (actual) lineas.push(actual);

  lineas.slice(0, 2).forEach((linea, i) => {
    ctx.fillText(linea, cx, y + i * 42, anchoMax);
  });
  ctx.restore();
};

/** Crea la imagen PNG del resumen del partido. */
export async function crearImagenResumenPartido(
  partido: Partido,
  datos: DatosImagenPartido
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el lienzo de la imagen.');

  // Fondo oscuro con un halo naranja y líneas de campo sutiles.
  const fondo = ctx.createLinearGradient(0, 0, ANCHO, ALTO);
  fondo.addColorStop(0, '#09090b');
  fondo.addColorStop(0.5, '#121214');
  fondo.addColorStop(1, '#1c0f06');
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  const halo = ctx.createRadialGradient(ANCHO - 40, 20, 0, ANCHO - 40, 20, 780);
  halo.addColorStop(0, 'rgba(249, 115, 22, 0.30)');
  halo.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ANCHO / 2, 615, 330, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(70, 615);
  ctx.lineTo(ANCHO - 70, 615);
  ctx.stroke();
  ctx.restore();

  // Fecha y hora arriba.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#a1a1aa';
  ctx.font = `600 34px ${FUENTE}`;
  ctx.fillText(fechaLarga(partido.fecha).toUpperCase(), ANCHO / 2, 150, 940);

  const hora = horaCorta(partido);
  if (hora) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 96px ${FUENTE}`;
    ctx.fillText(hora, ANCHO / 2, 268);
  }

  const yLinea = hora ? 312 : 210;
  ctx.fillStyle = '#f97316';
  redondear(ctx, ANCHO / 2 - 60, yLinea, 120, 8, 4);
  ctx.fill();

  // Escudos y marcador.
  const [imgLocal, imgVisitante] = await Promise.all([
    cargarImagen(datos.escudoLocal),
    cargarImagen(datos.escudoVisitante)
  ]);

  const cy = 615;
  const tamanoEscudo = 268;
  dibujarEscudo(ctx, imgLocal, partido.local, 210, cy, tamanoEscudo);
  dibujarEscudo(ctx, imgVisitante, partido.visitante, 870, cy, tamanoEscudo);

  const hayResultado =
    datos.golesLocal !== undefined &&
    datos.golesVisitante !== undefined &&
    datos.golesLocal !== null &&
    datos.golesVisitante !== null;
  const marcador = hayResultado ? `${datos.golesLocal} - ${datos.golesVisitante}` : 'VS';

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${hayResultado ? 132 : 104}px ${FUENTE}`;
  ctx.shadowColor = 'rgba(249, 115, 22, 0.45)';
  ctx.shadowBlur = 36;
  ctx.fillText(marcador, ANCHO / 2, cy, 360);
  ctx.restore();

  dibujarNombre(ctx, partido.local, 210, 790, 340);
  dibujarNombre(ctx, partido.visitante, 870, 790, 340);

  // Datos del partido (categoría, jornada y campo).
  const linea1 = [partido.categoria, partido.jornada].filter(Boolean).join(' · ');
  const linea2 = partido.campo || '';
  if (linea1 || linea2) {
    ctx.save();
    redondear(ctx, 90, 940, ANCHO - 180, 150, 34);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (linea1) {
      ctx.fillStyle = '#f4f4f5';
      ctx.font = `700 34px ${FUENTE}`;
      ctx.fillText(linea1, ANCHO / 2, linea2 ? 1000 : 1015, 840);
    }
    if (linea2) {
      ctx.fillStyle = '#a1a1aa';
      ctx.font = `500 27px ${FUENTE}`;
      ctx.fillText(linea2, ANCHO / 2, 1058, 840);
    }
    ctx.restore();
  }

  // Pie con el club y la temporada.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 36px ${FUENTE}`;
  ctx.fillText(datos.clubName || 'GoalManager', ANCHO / 2, 1210, 880);
  if (datos.temporada) {
    ctx.fillStyle = '#71717a';
    ctx.font = `600 24px ${FUENTE}`;
    ctx.fillText(`Temporada ${datos.temporada}`, ANCHO / 2, 1258);
  }

  ctx.fillStyle = '#f97316';
  redondear(ctx, ANCHO / 2 - 45, 1300, 90, 6, 3);
  ctx.fill();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.'))),
      'image/png',
      1
    );
  });
}

const limpiarTexto = (texto: string): string =>
  (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Nombre de archivo seguro para la imagen del partido. */
export const nombreArchivoImagen = (partido: Partido): string => {
  const base = `resumen-${limpiarTexto(partido.local)}-vs-${limpiarTexto(partido.visitante)}`;
  return `${base || 'resumen-partido'}.png`;
};

/** Descarga la imagen como archivo PNG. */
export const descargarImagen = (blob: Blob, nombre: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
};

/**
 * Intenta compartir la imagen con el menú del sistema (WhatsApp en móvil).
 * Si el navegador no lo permite, la descarga para adjuntarla a mano.
 */
export async function compartirImagen(
  blob: Blob,
  nombre: string
): Promise<'compartida' | 'descargada'> {
  const archivo = new File([blob], nombre, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (datos?: { files?: File[] }) => boolean;
  };

  if (nav.share && nav.canShare?.({ files: [archivo] })) {
    try {
      await nav.share({
        files: [archivo],
        title: 'Resumen del partido',
        text: 'Resumen del partido'
      });
      return 'compartida';
    } catch (error) {
      // Si el usuario cancela, no se descarga nada.
      if ((error as DOMException)?.name === 'AbortError') throw error;
    }
  }

  descargarImagen(blob, nombre);
  return 'descargada';
}
