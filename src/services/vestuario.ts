import { apiClient } from './apiClient';
import { FilaVestuario, VestuarioItem, VestuarioTipo } from '../types';

const SHEET_ITEMS = 'vestuario';
const SHEET_TIPOS = 'vestuario_tipos';

/**
 * ¿Está cerrado el plazo para que los jugadores editen su hoja?
 * `fechaLimite` es un día (YYYY-MM-DD): durante ese día aún se puede modificar.
 */
export const vestuarioCerrado = (fechaLimite?: string): boolean => {
  const raw = (fechaLimite || '').trim();
  if (!raw) return false;
  const limite = new Date(`${raw.slice(0, 10)}T23:59:59.999`);
  if (Number.isNaN(limite.getTime())) return false;
  return Date.now() > limite.getTime();
};

/** "25/10/2026" a partir de "2026-10-25" (entrada o texto libre). */
export const formatFechaLimite = (fechaLimite?: string): string => {
  const raw = (fechaLimite || '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : raw;
};

/** Tallas disponibles de una prenda (separadas por comas). Vacío → tallaje estándar. */
export const tallasDePrenda = (tipo?: VestuarioTipo, preset: string[] = []): string[] => {
  const lista = String(tipo?.tallasDisponibles || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
  return lista.length ? [...new Set(lista)] : preset;
};

/** Estados de entrega de una prenda dentro de la hoja. */
export const ESTADOS_ENTREGA = [
  { valor: 'pendiente', label: 'Pendiente', chip: 'bg-sky-100 text-sky-700' },
  { valor: 'entregado', label: 'Entregado', chip: 'bg-emerald-100 text-emerald-700' },
  { valor: 'sin_stock', label: 'Sin stock', chip: 'bg-rose-100 text-rose-700' }
] as const;

export type EstadoEntrega = (typeof ESTADOS_ENTREGA)[number]['valor'];

/** Apariencia del estado (por defecto pendiente). */
export const estadoInfo = (valor?: string): { valor: string; label: string; chip: string } =>
  ESTADOS_ENTREGA.find(e => e.valor === String(valor || 'pendiente').trim()) || ESTADOS_ENTREGA[0];

/** 'pagado' puede venir booleano o como texto desde la hoja. */
export const pagadoDe = (v?: { pagado?: boolean | string }): boolean =>
  v?.pagado === true || String(v?.pagado).toLowerCase() === 'true';

/** Unidades pedidas de una prenda en una lista de filas (con talla). */
export const unidadesDe = (filas: FilaVestuario[], prenda: string): number =>
  filas.filter(f => (f.tallas?.[prenda] || '').trim()).length;

/** Nº de prendas pagadas en una lista de filas. */
export const pagosDe = (filas: FilaVestuario[], prendas: string[]): number => {
  let n = 0;
  for (const f of filas) {
    for (const p of prendas) {
      if (f.pagados?.[p]) n++;
    }
  }
  return n;
};

export const vestuarioService = {
  getAll: async (): Promise<VestuarioItem[]> => {
    return apiClient.getAll<VestuarioItem>(SHEET_ITEMS);
  },

  create: async (item: Omit<VestuarioItem, 'id'> & { id?: string }): Promise<VestuarioItem> => {
    return apiClient.create<VestuarioItem>(SHEET_ITEMS, item);
  },

  update: async (item: VestuarioItem): Promise<VestuarioItem> => {
    return apiClient.update<VestuarioItem>(SHEET_ITEMS, item);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<VestuarioItem>(SHEET_ITEMS, id);
  }
};

export const vestuarioTiposService = {
  getAll: async (): Promise<VestuarioTipo[]> => {
    return apiClient.getAll<VestuarioTipo>(SHEET_TIPOS);
  },

  create: async (tipo: Omit<VestuarioTipo, 'id'> & { id?: string }): Promise<VestuarioTipo> => {
    return apiClient.create<VestuarioTipo>(SHEET_TIPOS, tipo);
  },

  update: async (tipo: VestuarioTipo): Promise<VestuarioTipo> => {
    return apiClient.update<VestuarioTipo>(SHEET_TIPOS, tipo);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<VestuarioTipo>(SHEET_TIPOS, id);
  }
};
