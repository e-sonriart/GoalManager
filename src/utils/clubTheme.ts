import { ClubConfig } from '../types';

/** Colores por defecto de la app (paleta Tailwind naranja) cuando el club no define los suyos. */
export const DEFAULT_PRIMARY = '#f97316';
export const DEFAULT_SECONDARY = '#f59e0b';

/** Nivel de mezcla por paso de la escala: [hacia blanco %, hacia negro %]. */
const SCALE: Record<string, [number, number]> = {
  '50': [95, 0],
  '100': [90, 0],
  '200': [78, 0],
  '300': [62, 0],
  '400': [38, 0],
  '500': [0, 0],
  '600': [0, 12],
  '700': [0, 25],
  '800': [0, 38],
  '900': [0, 52],
  '950': [0, 70]
};

const ORANGE_STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

const mix = (hex: string, white: number, black: number): string => {
  const toward = white > 0 ? '#ffffff' : '#000000';
  const pct = white > 0 ? white : black;
  if (pct <= 0) return hex;
  return `color-mix(in srgb, ${hex} ${100 - pct}%, ${toward})`;
};

/**
 * Aplica los colores del club sobre las variables de Tailwind (orange = primario,
 * amber = secundario) para que toda la app los use automáticamente.
 * Sin colores definidos, se restaura la paleta por defecto.
 */
export function applyClubTheme(config?: Partial<ClubConfig>): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primario = (config?.colorPrimario || '').trim();
  const secundario = (config?.colorSecundario || '').trim();

  const applyScale = (prefix: 'orange' | 'amber', base: string) => {
    ORANGE_STEPS.forEach(step => {
      const [w, b] = SCALE[step];
      root.style.setProperty(`--color-${prefix}-${step}`, mix(base, w, b));
    });
  };

  if (primario) applyScale('orange', primario);
  else ORANGE_STEPS.forEach(step => root.style.removeProperty(`--color-orange-${step}`));

  if (secundario) applyScale('amber', secundario);
  else ORANGE_STEPS.forEach(step => root.style.removeProperty(`--color-amber-${step}`));

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', primario || '#ea580c');
}

const hex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;

const toRgb = (h: string): [number, number, number] => {
  const s = h.replace('#', '');
  const full = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
};

/**
 * Extrae los dos colores dominantes (saturados) de una imagen de escudo.
 * Devuelve null si la imagen no se puede leer (CORS/tainted canvas).
 */
export async function extractShieldColors(
  url: string
): Promise<{ primario: string; secundario: string } | null> {
  if (!url || typeof document === 'undefined') return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('load'));
      img.src = url;
    });

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 200) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      // Descarta casi grises y casi blancos/negros: no sirven como color de marca
      if (max - min < 40 || max > 245 || max < 35) continue;
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const cur = bins.get(key);
      if (cur) {
        cur.n++;
        cur.r += r;
        cur.g += g;
        cur.b += b;
      } else {
        bins.set(key, { n: 1, r, g, b });
      }
    }

    const sorted = [...bins.values()].sort((a, b) => b.n - a.n);
    if (sorted.length === 0) return null;

    const top = sorted[0];
    const primario = hex(Math.round(top.r / top.n), Math.round(top.g / top.n), Math.round(top.b / top.n));

    let secundario = '';
    for (const cand of sorted) {
      const c = hex(Math.round(cand.r / cand.n), Math.round(cand.g / cand.n), Math.round(cand.b / cand.n));
      const [r1, g1, b1] = toRgb(primario);
      const [r2, g2, b2] = toRgb(c);
      const dist = Math.hypot(r1 - r2, g1 - g2, b1 - b2);
      if (dist > 70) {
        secundario = c;
        break;
      }
    }

    return { primario, secundario: secundario || primario };
  } catch {
    return null;
  }
}
