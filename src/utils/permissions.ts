import { AppTab, RolUsuario } from '../types';

/**
 * Sistema de permisos por rol.
 * Cada rol tiene un conjunto de permisos de vista (view:*) y de escritura (manage:*).
 * Un usuario nunca debe poder ver ni modificar nada para lo que no tenga permiso.
 */

export type Permission =
  | 'view:dashboard'
  | 'view:equipos'
  | 'view:partidos'
  | 'view:convocatorias'
  | 'view:asistencias'
  | 'view:estadisticas'
  | 'view:entrenamientos'
  | 'view:admin'
  | 'manage:jugadores'
  | 'manage:equipos'
  | 'manage:categorias'
  | 'manage:entrenadores'
  | 'manage:partidos'
  | 'manage:convocatorias'
  | 'manage:asistencias'
  | 'manage:estadisticas'
  | 'manage:entrenamientos'
  | 'manage:usuarios'
  | 'manage:sincronizacion'
  | 'manage:identidad';

export const ALL_PERMISSIONS: Permission[] = [
  'view:dashboard',
  'view:entrenamientos',
  'manage:entrenamientos',
  'view:equipos',
  'view:partidos',
  'view:convocatorias',
  'view:asistencias',
  'view:estadisticas',
  'view:admin',
  'manage:jugadores',
  'manage:equipos',
  'manage:categorias',
  'manage:entrenadores',
  'manage:partidos',
  'manage:convocatorias',
  'manage:asistencias',
  'manage:estadisticas',
  'manage:usuarios',
  'manage:sincronizacion',
  'manage:identidad'
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  'view:dashboard': 'Ver panel principal',
  'view:equipos': 'Ver equipos y estructura',
  'view:partidos': 'Ver calendario de partidos',
  'view:convocatorias': 'Ver convocatorias',
  'view:asistencias': 'Ver asistencias',
  'view:estadisticas': 'Ver estadísticas',
  'view:entrenamientos': 'Ver sesiones de entrenamiento',
  'view:admin': 'Acceder al panel de administración',
  'manage:jugadores': 'Gestionar jugadores',
  'manage:equipos': 'Gestionar equipos',
  'manage:categorias': 'Gestionar categorías',
  'manage:entrenadores': 'Gestionar entrenadores',
  'manage:partidos': 'Gestionar partidos',
  'manage:convocatorias': 'Gestionar convocatorias',
  'manage:asistencias': 'Gestionar asistencias',
  'manage:estadisticas': 'Gestionar estadísticas',
  'manage:entrenamientos': 'Gestionar sesiones de entrenamiento',
  'manage:usuarios': 'Gestionar usuarios y roles',
  'manage:sincronizacion': 'Sincronizar y restablecer datos',
  'manage:identidad': 'Editar identidad del club'
};

export const VIEW_PERMISSIONS: Permission[] = [
  'view:dashboard',
  'view:equipos',
  'view:partidos',
  'view:convocatorias',
  'view:asistencias',
  'view:estadisticas',
  'view:entrenamientos',
  'view:admin'
];

export const MANAGE_PERMISSIONS: Permission[] = [
  'manage:jugadores',
  'manage:entrenamientos',
  'manage:equipos',
  'manage:categorias',
  'manage:entrenadores',
  'manage:partidos',
  'manage:convocatorias',
  'manage:asistencias',
  'manage:estadisticas',
  'manage:usuarios',
  'manage:sincronizacion',
  'manage:identidad'
];

const TABS_VISIBLES: Record<AppTab, Permission> = {
  dashboard: 'view:dashboard',
  equipos: 'view:equipos',
  partidos: 'view:partidos',
  convocatorias: 'view:convocatorias',
  alineacion: 'view:partidos',
  eventos: 'view:partidos',
  estadisticas: 'view:estadisticas',
  entrenamientos: 'view:entrenamientos',
  admin: 'view:admin'
};

const VIEW_SPORT_READ_ONLY: Permission[] = [
  'view:dashboard',
  'view:equipos',
  'view:partidos',
  'view:convocatorias',
  'view:asistencias',
  'view:estadisticas',
  'view:entrenamientos'
];

const MANAGE_SPORT_TEAM: Permission[] = [
  'manage:partidos',
  'manage:convocatorias',
  'manage:asistencias',
  'manage:estadisticas'
];

// Gestión de sesiones de entrenamiento: la ejercen quienes crean/corrige: admin, dirección deportiva
// y entrenadores asignados. Los coordinadores solo las consultan (view), nunca las gestionan.
const MANAGE_ENTRENAMIENTOS: Permission[] = ['manage:entrenamientos'];

const ROLE_PERMISSIONS: Record<RolUsuario, Permission[]> = {
  // Acceso total: puede verlo y gestionarlo todo.
  admin: ALL_PERMISSIONS,

  directiva: [
    ...VIEW_SPORT_READ_ONLY,
    'view:admin',
    'manage:jugadores',
    'manage:equipos',
    'manage:categorias',
    'manage:entrenadores',
    ...MANAGE_SPORT_TEAM,
    ...MANAGE_ENTRENAMIENTOS,
    'manage:sincronizacion',
    'manage:identidad'
  ],

  // Coordinadores: gestión deportiva completa de su área (filtrada a F8 / F11),
  // sin tocar estructura administrativa ni usuarios.
  coordinador_f8: [...VIEW_SPORT_READ_ONLY, 'manage:jugadores', ...MANAGE_ENTRENAMIENTOS, ...MANAGE_SPORT_TEAM],
  coordinador_f11: [...VIEW_SPORT_READ_ONLY, 'manage:jugadores', ...MANAGE_ENTRENAMIENTOS, ...MANAGE_SPORT_TEAM],

  // Entrenador: gestiona convocatorias, asistencias, partidos, estadísticas y su plantilla.
  entrenador: [
    ...VIEW_SPORT_READ_ONLY,
    'manage:jugadores',
    ...MANAGE_ENTRENAMIENTOS,
    ...MANAGE_SPORT_TEAM
  ],

  // Jugador: solo lectura deportiva de su equipo.
  jugador: VIEW_SPORT_READ_ONLY,

  // Perfiles externos: solo información general y calendario.
  aficionado: ['view:dashboard', 'view:partidos']
};

const CACHE = new Map<string, ReadonlySet<Permission>>();

export function getRolePermissions(rol?: RolUsuario | null): ReadonlySet<Permission> {
  const key = rol || 'aficionado';
  const cached = CACHE.get(key);
  if (cached) return cached;
  const perms = new Set<Permission>(ROLE_PERMISSIONS[key] || ROLE_PERMISSIONS.aficionado);
  CACHE.set(key, perms);
  return perms;
}

/**
 * Comprueba si un rol dispone del permiso solicitado.
 * Si no hay usuario, se usan los permisos mínimos (aficionado).
 */
export function canRole(rol: RolUsuario | null | undefined, permission: Permission): boolean {
  return getRolePermissions(rol).has(permission);
}

/**
 * Devuelve las pestañas de navegación permitidas para un rol.
 */
export function allowedTabsFor(rol?: RolUsuario | null): AppTab[] {
  const perms = getRolePermissions(rol);
  const tabs = Object.entries(TABS_VISIBLES)
    .filter(([, perm]) => perms.has(perm))
    .map(([tab]) => tab as AppTab);
  return tabs.length > 0 ? tabs : ['dashboard'];
}

export function tabVisible(rol: RolUsuario | null | undefined, tab: AppTab): boolean {
  const perm = TABS_VISIBLES[tab];
  return canRole(rol, perm);
}