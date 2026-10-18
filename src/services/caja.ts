import { apiClient } from './apiClient';
import { CajaJugador, VestuarioItem, VestuarioTipo } from '../types';
import { pagadoDe, precioDe } from './vestuario';

const SHEET_CAJA = 'caja';

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
