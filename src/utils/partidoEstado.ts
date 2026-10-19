import { Partido } from '../types';

/** Elemento que puede suspenderse (partidos y sesiones de entrenamiento) */
export interface ItemSuspendible {
  suspendido?: boolean | string;
  suspensionMotivo?: string;
  suspensionHasta?: string;
}

export interface SuspensionInfo {
  /** ¿Suspendido ahora mismo? (marcado y sin fecha de reanudación caducada) */
  activa: boolean;
  /** La suspensión tiene fecha de reanudación (temporal) */
  temporal: boolean;
  /** Mensaje/motivo que verá el equipo */
  motivo: string;
  /** 'YYYY-MM-DD' | 'YYYY-MM-DDTHH:MM' | '' */
  hasta: string;
  /** temporal y la fecha de reanudación ya pasó */
  caducada: boolean;
}

const flagActivo = (v?: boolean | string): boolean => {
  if (v === true) return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'si' || s === 'sí';
  }
  return false;
};

/** Momento en el que acaba la suspensión temporal (solo fecha -> todo ese día) */
const finSuspension = (hasta: string): number | null => {
  const raw = hasta.trim();
  if (!raw) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59` : raw;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
};

/** Estado de suspensión de un partido o una sesión */
export const infoSuspension = (item?: ItemSuspendible | null): SuspensionInfo => {
  const marcado = flagActivo(item?.suspendido);
  const motivo = String(item?.suspensionMotivo || '').trim();
  const hasta = String(item?.suspensionHasta || '').trim();
  const fin = finSuspension(hasta);
  const temporal = marcado && fin != null;
  const caducada = temporal && fin != null && Date.now() > fin;
  return { activa: marcado && !caducada, temporal, motivo, hasta, caducada };
};

/** ¿Está suspendido ahora mismo? (una temporal caducada se toma por no suspendida) */
export const isItemSuspendido = (item?: ItemSuspendible | null): boolean =>
  infoSuspension(item).activa;

/** Compatibilidad: ¿el partido está suspendido ahora mismo? */
export const isPartidoSuspendido = (p?: Partial<Partido> | null): boolean =>
  isItemSuspendido(p);
