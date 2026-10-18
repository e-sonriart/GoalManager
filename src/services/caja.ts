import { apiClient } from './apiClient';
import { CajaJugador, ClubConfig, PagoCaja, VestuarioItem, VestuarioTipo } from '../types';
import { pagadoDe, precioDe } from './vestuario';

const SHEET_CAJA = 'caja';

/** Columnas de la hoja de caja (conceptos que se cobran). */
export const CAMPOS = [
  { campo: 'matricula', label: 'Matrícula' },
  { campo: 'temporada', label: 'Temporada' },
  { campo: 'ropaNuevo', label: 'Ropa nuevo' },
  { campo: 'ropaRenovacion', label: 'Ropa renovación' }
] as const;

export type CampoImporte = (typeof CAMPOS)[number]['campo'];

/** Formas de pago admitidas en cada apartado. */
export const METODOS_PAGO = [
  { valor: 'efectivo', label: 'Efectivo' },
  { valor: 'transferencia', label: 'Transferencia' },
  { valor: 'tarjeta', label: 'Tarjeta' }
] as const;

/** Importes por defecto de la hoja de caja (los guarda el rol Caja). */
export interface CajaDefaults {
  matricula: string;
  temporada: string;
  ropaNuevo: string;
  ropaRenovacion: string;
}

/** Importes por defecto guardados en la configuración del club. */
export const defaultsDe = (cfg?: Partial<ClubConfig> | null): CajaDefaults => ({
  matricula: String(cfg?.cajaDefMatricula || '').trim(),
  temporada: String(cfg?.cajaDefTemporada || '').trim(),
  ropaNuevo: String(cfg?.cajaDefRopaNuevo || '').trim(),
  ropaRenovacion: String(cfg?.cajaDefRopaRenovacion || '').trim()
});

/** Importe en euros de texto libre ("60", "12,50", "1.250,50") → número. */
export const parseImporte = (valor?: string): number => {
  const raw = String(valor ?? '')
    .trim()
    .replace(/[^\d.,-]/g, '');
  if (!raw) return 0;
  // Formato español: 1.250,50 → 1250.50
  const conComa = raw.replace(/\./g, '').replace(',', '.');
  const soloPunto = raw.replace(/,/g, '.');
  const normal = raw.includes(',') ? conComa : soloPunto;
  const n = Number(normal);
  return Number.isFinite(n) ? n : 0;
};

/** Suma de los cuatro importes de una ficha de caja. */
export const totalDe = (fila: Partial<CajaJugador>): number =>
  parseImporte(fila.matricula) +
  parseImporte(fila.temporada) +
  parseImporte(fila.ropaNuevo) +
  parseImporte(fila.ropaRenovacion);

/** Cobro guardado de un apartado de una ficha de caja. */
export const pagoDe = (fila: Partial<CajaJugador>, campo: CampoImporte): PagoCaja =>
  (fila.pagos && fila.pagos[campo]) || {};

/** Estado de un apartado: sin importe | pendiente | pago fraccionado | pagado. */
export type EstadoPago = 'vacio' | 'pendiente' | 'parcial' | 'pagado';

/** Dinero cobrado de un apartado: la casilla "Pagado" cuenta como cobro completo. */
export const cobradoDe = (deuda: number, pago?: PagoCaja): number => {
  const explicito = parseImporte(pago?.importe);
  if (pago?.pagado) return Math.max(explicito, deuda);
  return explicito;
};

/** Lo que falta por cobrar de un apartado (0 si está marcado como pagado). */
export const faltanteDe = (deuda: number, pago?: PagoCaja): number =>
  Math.max(deuda - cobradoDe(deuda, pago), 0);

/** Clasificación visual de un apartado a partir de su importe y su cobro. */
export const estadoDe = (deuda: number, pago?: PagoCaja): EstadoPago => {
  const cobrado = cobradoDe(deuda, pago);
  if (deuda <= 0 && cobrado <= 0) return 'vacio';
  if (deuda > 0 && cobrado >= deuda) return 'pagado';
  if (cobrado > 0) return 'parcial';
  return 'pendiente';
};

/** Cobro total de una fila: se suma apartado a apartado (sin compensar entre ellos). */
export const cobroDe = (fila: Partial<CajaJugador>): { cobrado: number; faltante: number } => {
  let cobrado = 0;
  let faltante = 0;
  for (const c of CAMPOS) {
    const deuda = parseImporte(fila[c.campo]);
    const pago = pagoDe(fila, c.campo);
    cobrado += cobradoDe(deuda, pago);
    faltante += faltanteDe(deuda, pago);
  }
  return { cobrado, faltante };
};

/** Importe en euros listo para mostrar ("1.250,50 €"). */
export const formatEuros = (n: number): string => {
  const partes = Math.abs(n).toFixed(2).split('.');
  const entero = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const signo = n < 0 ? '-' : '';
  const decimales = partes[1] === '00' ? '' : `,${partes[1]}`;
  return `${signo}${entero}${decimales} €`;
};

/**
 * Ropa entregada y todavía sin pagar de un jugador.
 * (Entregado en la hoja de vestuario + icono de dinero en gris → pendiente de cobro.)
 */
export const pendienteCobroDe = (
  jugadorId: string,
  vestuario: VestuarioItem[],
  tipos: VestuarioTipo[]
): { prendas: number; euros: number; sinPrecio: boolean } => {
  let prendas = 0;
  let euros = 0;
  let sinPrecio = false;
  for (const v of vestuario) {
    if (v.jugadorId !== jugadorId) continue;
    if ((v.estado || '').trim() !== 'entregado') continue;
    if (pagadoDe(v)) continue;
    if (!(v.talla || '').trim()) continue;
    prendas++;
    const tipo = tipos.find(t => (t.nombre || '').trim() === (v.tipoPrenda || '').trim());
    const precio = precioDe(tipo);
    if (!precio) {
      sinPrecio = true;
      continue;
    }
    euros += parseImporte(precio);
  }
  return { prendas, euros, sinPrecio };
};

export const cajaService = {
  getAll: async (): Promise<CajaJugador[]> => {
    return apiClient.getAll<CajaJugador>(SHEET_CAJA);
  },

  create: async (fila: CajaJugador): Promise<CajaJugador> => {
    return apiClient.create<CajaJugador>(SHEET_CAJA, fila);
  },

  update: async (fila: CajaJugador): Promise<CajaJugador> => {
    return apiClient.update<CajaJugador>(SHEET_CAJA, fila);
  },

  /** Guarda (o actualiza) la ficha de caja de un jugador usando su id. */
  save: async (fila: CajaJugador, existe: boolean): Promise<CajaJugador> =>
    existe ? apiClient.update<CajaJugador>(SHEET_CAJA, fila) : apiClient.create<CajaJugador>(SHEET_CAJA, fila)
};
