import { RolUsuario } from '../types';

/**
 * Metadatos centralizados de los roles del club.
 * Evita duplicar etiquetas/colores en AdminPanel, Dashboard, etc.
 */

export type RoleScope = 'total' | 'direccion' | 'coordinacion' | 'tecnico' | 'lectura' | 'externo';

export interface RoleInfo {
  rol: RolUsuario;
  label: string;
  shortLabel: string;
  description: string;
  scope: RoleScope;
  requiresTeam: boolean;
  avatarBg: string;
  badgeClass: string;
  dotClass: string;
}

export const ROLE_INFO: Record<RolUsuario, RoleInfo> = {
  admin: {
    rol: 'admin',
    label: 'Administrador',
    shortLabel: 'Admin',
    description: 'Control total: estructura, datos, usuarios, sincronización e identidad del club.',
    scope: 'total',
    requiresTeam: false,
    avatarBg: 'bg-red-600 text-white',
    badgeClass: 'bg-red-50 text-red-700 border border-red-200',
    dotClass: 'bg-red-500'
  },

  directiva: {
    rol: 'directiva',
    label: 'Junta directiva',
    shortLabel: 'Directiva',
    description: 'Mismos accesos que dirección deportiva, orientado a la junta del club.',
    scope: 'direccion',
    requiresTeam: false,
    avatarBg: 'bg-violet-600 text-white',
    badgeClass: 'bg-violet-50 text-violet-700 border border-violet-200',
    dotClass: 'bg-violet-500'
  },
  coordinador_f8: {
    rol: 'coordinador_f8',
    label: 'Coordinador F8',
    shortLabel: 'Coord. F8',
    description: 'Coordinación del área de fútbol 8: gestión deportiva de sus equipos y categorías.',
    scope: 'coordinacion',
    requiresTeam: false,
    avatarBg: 'bg-emerald-600 text-white',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dotClass: 'bg-emerald-500'
  },
  coordinador_f11: {
    rol: 'coordinador_f11',
    label: 'Coordinador F11',
    shortLabel: 'Coord. F11',
    description: 'Coordinación del área de fútbol 11: gestión deportiva de sus equipos y categorías.',
    scope: 'coordinacion',
    requiresTeam: false,
    avatarBg: 'bg-teal-600 text-white',
    badgeClass: 'bg-teal-50 text-teal-700 border border-teal-200',
    dotClass: 'bg-teal-500'
  },
  entrenador: {
    rol: 'entrenador',
    label: 'Entrenador',
    shortLabel: 'Entrenador',
    description: 'Gestiona la plantilla, convocatorias, asistencias, partidos y estadísticas de su equipo.',
    scope: 'tecnico',
    requiresTeam: true,
    avatarBg: 'bg-blue-600 text-white',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    dotClass: 'bg-blue-500'
  },
  jugador: {
    rol: 'jugador',
    label: 'Jugador',
    shortLabel: 'Jugador',
    description: 'Consulta en modo lectura la información deportiva. Vinculado a la plantilla de su equipo.',
    scope: 'lectura',
    requiresTeam: true,
    avatarBg: 'bg-orange-500 text-white',
    badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
    dotClass: 'bg-orange-500'
  },

  aficionado: {
    rol: 'aficionado',
    label: 'Aficionado',
    shortLabel: 'Aficionado',
    description: 'Acceso público de solo lectura al panel y al calendario de partidos.',
    scope: 'externo',
    requiresTeam: false,
    avatarBg: 'bg-slate-600 text-white',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    dotClass: 'bg-slate-500'
  }
};

/** Orden recomendado para mostrar en selectores (de mayor a menor privilegio). */
export const ROLE_ORDER: RolUsuario[] = [
  'admin',
  'directiva',
  'coordinador_f8',
  'coordinador_f11',
  'entrenador',
  'jugador',
  'aficionado'
];

export const SCOPE_LABELS: Record<RoleScope, string> = {
  total: 'Acceso total',
  direccion: 'Dirección',
  coordinacion: 'Coordinación',
  tecnico: 'Cuerpo técnico',
  lectura: 'Solo lectura',
  externo: 'Externo'
};

export function getRoleInfo(rol?: RolUsuario | null): RoleInfo {
  if (rol && ROLE_INFO[rol]) return ROLE_INFO[rol];
  return ROLE_INFO.aficionado;
}

export function roleRequiresTeam(rol?: RolUsuario | null): boolean {
  return getRoleInfo(rol).requiresTeam;
}
