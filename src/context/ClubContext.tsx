import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  Jugador,
  Equipo,
  Categoria,
  Entrenador,
  Partido,
  Asistencia,
  Estadistica,
  Usuario,
  RolUsuario,
  ToastMessage,
  EstadoConvocatoria,
  EstadoAsistencia,
  ClubConfig,
  SesionEntrenamiento,
  AppTab
} from '../types';
import { DEFAULT_CLUB_SHIELD } from '../utils/shieldPresets';
import { jugadoresService } from '../services/jugadores';
import { equiposService } from '../services/equipos';
import { categoriasService } from '../services/categorias';
import { entrenadoresService } from '../services/entrenadores';
import { partidosService } from '../services/partidos';
import { sesionesService } from '../services/sesiones';
import { asistenciasService } from '../services/asistencias';
import { estadisticasService } from '../services/estadisticas';
import { usuariosService } from '../services/usuarios';
import { clubConfigService } from '../services/clubConfig';
import { apiClient, getGasUrl, setGasUrl as setGasUrlStore } from '../services/apiClient';
import { getSupabaseUrl, getSupabaseAnonKey } from '../services/supabaseClient';
import { exportToCsv } from '../utils/exportUtils';
import { Permission, canRole, allowedTabsFor } from '../utils/permissions';
import { getJugadorUsuario } from '../utils/playerUsername';
import type { PlayerStatsDelta } from '../utils/playerStatsFromEvents';
import { convocatoriaStatsDeltas } from '../utils/playerStatsFromEvents';

/** Sesión sintética para el acceso de jugadores (usuario = nombre.dorsal). */
const toJugadorUsuario = (j: Jugador, all: Jugador[]): Usuario => ({
  id: j.id,
  nombre: j.nombre,
  email: getJugadorUsuario(j, all),
  rol: 'jugador',
  equipo: j.equipo || undefined
});

interface ClubContextType {
  // Estado de usuario y autenticación
  currentUser: Usuario | null;
  setCurrentUser: (user: Usuario | null) => void;
  users: Usuario[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  can: (permission: Permission) => boolean;
  allowedTabs: AppTab[];
  /** true si el rol actual solo puede ver los equipos que tenga asignados. */
  isTeamScoped: boolean;
  /** Nombres de los equipos asignados al usuario actual. */
  assignedTeams: string[];

  // Entidades principales
  jugadores: Jugador[];
  /** Todos los jugadores del club, sin scoping por equipo (para convocar de otros equipos / sin equipo). */
  allJugadores: Jugador[];
  equipos: Equipo[];
  categorias: Categoria[];
  entrenadores: Entrenador[];
  partidos: Partido[];
  asistencias: Asistencia[];
  estadisticas: Estadistica[];
  sesiones: SesionEntrenamiento[];
  visibleSesiones: SesionEntrenamiento[];

  // Identidad y Personalización del Club
  clubConfig: ClubConfig;
  saveClubConfig: (config: Partial<ClubConfig>) => void;
  getTeamEscudo: (teamName: string) => string | undefined;

  // Estado de carga y sincronización
  loading: boolean;
  refreshAll: () => Promise<void>;
  gasUrl: string;
  updateGasUrl: (url: string) => void;
  isOnlineConfigured: boolean;
  testGoogleConnection: (targetUrl?: string) => Promise<{ success: boolean; message: string }>;
  initRemoteSheets: () => Promise<{ success: boolean; message: string }>;
  resetDatabase: () => void;

  // Notificaciones
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Operaciones Jugadores
  saveJugador: (jugador: Partial<Jugador>) => Promise<boolean>;
  deleteJugador: (id: string) => Promise<boolean>;

  // Operaciones Equipos
  saveEquipo: (equipo: Partial<Equipo>) => Promise<boolean>;
  deleteEquipo: (id: string) => Promise<boolean>;

  // Operaciones Categorías
  saveCategoria: (categoria: Partial<Categoria>) => Promise<boolean>;
  deleteCategoria: (id: string) => Promise<boolean>;

  // Operaciones Entrenadores
  saveEntrenador: (entrenador: Partial<Entrenador>) => Promise<boolean>;
  deleteEntrenador: (id: string) => Promise<boolean>;

  // Operaciones Partidos
  savePartido: (partido: Partial<Partido>) => Promise<boolean>;
  deletePartido: (id: string) => Promise<boolean>;

  // Operaciones Sesiones de Entrenamiento
  saveSesion: (sesion: Partial<SesionEntrenamiento>) => Promise<boolean>;
  deleteSesion: (id: string) => Promise<boolean>;

  // Convocatorias
  toggleConvocatoria: (partidoId: string, jugadorId: string) => Promise<void>;
  setConvocatoriaEstado: (partidoId: string, jugadorId: string, estado: EstadoConvocatoria) => Promise<void>;
  batchSetConvocatoriaEstado: (partidoId: string, jugadorIds: string[], estado: EstadoConvocatoria) => Promise<void>;

  // Asistencias
  saveAsistencia: (asistencia: Partial<Asistencia>) => Promise<boolean>;
  deleteAsistencia: (id: string) => Promise<boolean>;
  toggleAsistencia: (jugadorId: string, fecha: string, estado: EstadoAsistencia) => Promise<void>;
  batchMarkAsistencia: (fecha: string, jugadorIds: string[], estado: EstadoAsistencia) => Promise<void>;

  // Estadísticas
  saveEstadistica: (estadistica: Partial<Estadistica> & { jugadorId: string }) => Promise<boolean>;
  applyEventStats: (deltas: PlayerStatsDelta[], sign: 1 | -1) => Promise<boolean>;

  // Apuestas (Porra)
  submitApuesta: (partidoId: string, resultado: string) => Promise<boolean>;
  deleteApuesta: (id: string) => Promise<boolean>;

  // Estado de modales y config
  isConfigModalOpen: boolean;
  setIsConfigModalOpen: (open: boolean) => void;
  googleScriptUrl: string;
  setGoogleScriptUrl: (url: string) => void;
  syncAllData: () => Promise<void>;
  resetDataToMock: () => void;
  exportAllSheets: () => void;

  // Operaciones Usuarios
  saveUser: (user: Partial<Usuario>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;

  // Exportación
  exportSheet: (sheetName: string) => void;
}

/**
 * Roles que solo pueden ver la información de los equipos que tengan asignados.
 */
const TEAM_SCOPED_ROLES = new Set<RolUsuario>(['entrenador', 'jugador']);

const ClubContext = createContext<ClubContextType | undefined>(undefined);

const DEFAULT_CLUB_CONFIG: ClubConfig = {
  nombre: 'Club de Fútbol Naranja',
  escudo: DEFAULT_CLUB_SHIELD,
  acronimo: 'CFN',
  lema: 'Pasión, disciplina y victoria',
  temporada: '2025/2026'
};

const readLocalClubConfig = (): (ClubConfig & { ts?: number }) | null => {
  try {
    const raw = localStorage.getItem('cf_club_config');
    return raw ? (JSON.parse(raw) as ClubConfig & { ts?: number }) : null;
  } catch {
    return null;
  }
};

export const ClubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [gasUrl, setGasUrlState] = useState<string>(getGasUrl());
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Datos
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [entrenadores, setEntrenadores] = useState<Entrenador[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadistica[]>([]);
  const [sesiones, setSesiones] = useState<SesionEntrenamiento[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);

  // Configuración e Identidad del Club
  const [clubConfig, setClubConfig] = useState<ClubConfig>(() => {
    const saved = readLocalClubConfig();
    return saved ? { ...DEFAULT_CLUB_CONFIG, ...saved } : { ...DEFAULT_CLUB_CONFIG };
  });

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const saveClubConfig = useCallback((newConfig: Partial<ClubConfig>) => {
    const ts = Date.now();
    const merged: ClubConfig = { ...clubConfig, ...newConfig, ts };
    setClubConfig(merged);
    try {
      localStorage.setItem('cf_club_config', JSON.stringify(merged));
    } catch {
      // ignore
    }
    // Subir a Supabase para que móvil y PC compartan la misma identidad (best-effort)
    clubConfigService.save(merged).catch(err => {
      console.warn('[clubConfig] No se pudo sincronizar la identidad del club', err);
    });
    addToast({
      type: 'success',
      title: 'Identidad Actualizada',
      message: 'El nombre y escudo del club han sido guardados correctamente.'
    });
  }, [clubConfig, addToast]);

  // Mapa de escudos por equipo (cacheado para evitar búsquedas lineales en cada render)
  const escudoByTeam = useMemo(() => {
    const map = new Map<string, string>();
    equipos.forEach(e => {
      if (e.nombre) map.set(e.nombre.toLowerCase().trim(), e.escudo || clubConfig.escudo);
    });
    return map;
  }, [equipos, clubConfig.escudo]);

  const getTeamEscudo = useCallback((teamName: string): string => {
    if (!teamName) return clubConfig.escudo;
    return escudoByTeam.get(teamName.toLowerCase().trim()) || clubConfig.escudo;
  }, [clubConfig.escudo, escudoByTeam]);

  // Roles cuyo acceso a datos queda limitado a los equipos que tengan asignados.
  const scopedTeamNames = useMemo<Set<string> | null>(() => {
    if (!currentUser || !TEAM_SCOPED_ROLES.has(currentUser.rol)) return null;
    const names = new Set<string>();
    const add = (value?: string) => {
      if (value && value.trim()) names.add(value.toLowerCase().trim());
    };
    add(currentUser.equipo);
    // Un entrenador puede figurar en varios equipos por su nombre en la plantilla técnica.
    if (currentUser.rol === 'entrenador') {
      const coachName = currentUser.nombre.trim().toLowerCase();
      equipos.forEach(e => {
        const list = e.entrenadores && e.entrenadores.length
          ? e.entrenadores
          : (e.entrenador ? e.entrenador.split(',').map(s => s.trim()) : []);
        if (list.some(n => n.trim().toLowerCase() === coachName)) add(e.nombre);
      });
    }
    return names;
  }, [currentUser, equipos]);

  const visibleEquipos = useMemo(
    () => (scopedTeamNames ? equipos.filter(e => scopedTeamNames.has(e.nombre.toLowerCase().trim())) : equipos),
    [equipos, scopedTeamNames]
  );

  const isTeamScoped = scopedTeamNames !== null;
  const assignedTeams = useMemo(() => visibleEquipos.map(e => e.nombre), [visibleEquipos]);

  const visibleCategorias = useMemo(() => {
    if (!scopedTeamNames) return categorias;
    const catNames = new Set(visibleEquipos.map(e => (e.categoria || '').toLowerCase().trim()));
    return categorias.filter(c => catNames.has(c.nombre.toLowerCase().trim()));
  }, [categorias, scopedTeamNames, visibleEquipos]);

  const visibleEntrenadores = useMemo(() => {
    if (!scopedTeamNames) return entrenadores;
    const names = new Set<string>();
    visibleEquipos.forEach(e => {
      const list = e.entrenadores && e.entrenadores.length
        ? e.entrenadores
        : (e.entrenador ? e.entrenador.split(',').map(s => s.trim()) : []);
      list.forEach(n => names.add(n.trim().toLowerCase()));
    });
    if (currentUser?.nombre) names.add(currentUser.nombre.trim().toLowerCase());
    return entrenadores.filter(en => names.has(en.nombre.trim().toLowerCase()));
  }, [entrenadores, scopedTeamNames, visibleEquipos, currentUser?.nombre]);

  const visibleJugadores = useMemo(
    () => (scopedTeamNames ? jugadores.filter(j => scopedTeamNames.has(j.equipo.toLowerCase().trim())) : jugadores),
    [jugadores, scopedTeamNames]
  );

  const visibleJugadorIds = useMemo(() => new Set(visibleJugadores.map(j => j.id)), [visibleJugadores]);

  const visiblePartidos = useMemo(() => {
    if (!scopedTeamNames) return partidos;
    return partidos.filter(p => {
      const equipo = (p.equipo || '').toLowerCase().trim();
      if (equipo && scopedTeamNames.has(equipo)) return true;
      const local = (p.local || '').toLowerCase().trim();
      const visitante = (p.visitante || '').toLowerCase().trim();
      return scopedTeamNames.has(local) || scopedTeamNames.has(visitante);
    });
  }, [partidos, scopedTeamNames]);

  const visibleAsistencias = useMemo(
    () => (scopedTeamNames ? asistencias.filter(a => visibleJugadorIds.has(a.jugadorId)) : asistencias),
    [asistencias, scopedTeamNames, visibleJugadorIds]
  );

  const visibleEstadisticas = useMemo(
    () => (scopedTeamNames ? estadisticas.filter(s => visibleJugadorIds.has(s.jugadorId)) : estadisticas),
    [estadisticas, scopedTeamNames, visibleJugadorIds]
  );

  // Sesiones de entrenamiento: los roles con equipo asignado solo ven las suyas y los
  // coordinadores por categoría (F8, F11) ven solo su modalidad.
  const visibleSesiones = useMemo(() => {
    let scoped = sesiones;
    if (scopedTeamNames) {
      scoped = sesiones.filter(s => {
        const equipo = (s.equipo || '').toLowerCase().trim();
        return equipo && scopedTeamNames.has(equipo);
      });
    }
    const rol = currentUser?.rol;
    if (rol === 'coordinador_f8' || rol === 'coordinador_f11') {
      const soloF8 = rol === 'coordinador_f8';
      return scoped.filter(s => {
        const tipo = (s.tipo || '').toUpperCase();
        if (!tipo) {
          const cat = categorias.find(c => (c.nombre || '').toLowerCase().trim() === (s.categoria || '').toLowerCase().trim());
          return cat ? (cat.tipo === 'F8') === soloF8 : true;
        }
        return (tipo === 'F8') === soloF8;
      });
    }
    return scoped;
  }, [sesiones, scopedTeamNames, categorias, currentUser?.rol]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const localConfig = readLocalClubConfig();
      const [
        jugs,
        eqs,
        cats,
        ents,
        pars,
        asists,
        stats,
        sesses,
        usrs,
        remoteConfig
      ] = await Promise.all([
        jugadoresService.getAll(),
        equiposService.getAll(),
        categoriasService.getAll(),
        entrenadoresService.getAll(),
        partidosService.getAll(),
        asistenciasService.getAll(),
        estadisticasService.getAll(),
        sesionesService.getAll(),
        usuariosService.getAll(),
        clubConfigService.get()
      ]);

      setJugadores(jugs);
      setEquipos(eqs);
      setCategorias(cats);
      setEntrenadores(ents);
      setPartidos(pars);
      setAsistencias(asists);
      setEstadisticas(stats);
      setSesiones(sesses);
      // Asegurar que jugadores y entrenadores tengan un equipo asignado de los registrados
      const defaultTeam = eqs[0]?.nombre || 'Club Naranja Principal';
      const sanitizedUsrs = usrs.map(u => {
        let next = u;
        if ((u.rol === 'entrenador' || u.rol === 'jugador') && !u.equipo) {
          if (u.rol === 'entrenador') {
            const match = eqs.find(e => e.entrenador && (e.entrenador.toLowerCase().includes(u.nombre.toLowerCase()) || u.nombre.toLowerCase().includes(e.entrenador.toLowerCase())));
            next = { ...u, equipo: match ? match.nombre : defaultTeam };
          } else if (u.rol === 'jugador') {
            const match = jugs.find(j => j.nombre && (j.nombre.toLowerCase().includes(u.nombre.toLowerCase()) || u.nombre.toLowerCase().includes(j.nombre.toLowerCase())));
            next = { ...u, equipo: match ? match.equipo : defaultTeam };
          } else {
            next = { ...u, equipo: defaultTeam };
          }
        }
        // Cuentas antiguas guardadas sin contraseña: se les asigna la temporal por defecto
        if (!next.password) {
          next = { ...next, password: '123456' };
        }
        return next;
      });

      setUsers(sanitizedUsrs);

      // Sincronizar identidad del club (nombre/escudo) entre dispositivos: gana la última edición (ts)
      try {
        const localTs = Number(localConfig?.ts) || 0;
        const remoteTs = Number(remoteConfig?.ts) || 0;
        if (remoteConfig && remoteTs > localTs) {
          const merged: ClubConfig = {
            ...DEFAULT_CLUB_CONFIG,
            nombre: remoteConfig.nombre || DEFAULT_CLUB_CONFIG.nombre,
            escudo: remoteConfig.escudo || DEFAULT_CLUB_CONFIG.escudo,
            acronimo: remoteConfig.acronimo ?? DEFAULT_CLUB_CONFIG.acronimo,
            lema: remoteConfig.lema ?? DEFAULT_CLUB_CONFIG.lema,
            temporada: remoteConfig.temporada ?? DEFAULT_CLUB_CONFIG.temporada,
            ts: remoteTs
          };
          localStorage.setItem('cf_club_config', JSON.stringify(merged));
          setClubConfig(merged);
        } else if (localConfig && localTs > remoteTs) {
          // Este dispositivo tiene una edición más reciente → subirla al resto
          await clubConfigService.save({ ...localConfig, ts: localTs });
        }
      } catch {
        // Sincronización de identidad: mejor esfuerzo, no bloquea la carga
      }

      // Restaurar SOLO la sesión guardada; si no hay sesión válida, mostrar pantalla de login
      if (!currentUser && (sanitizedUsrs.length > 0 || jugs.length > 0)) {
        const storedUser = localStorage.getItem('cf_current_user_id');
        let found = storedUser ? sanitizedUsrs.find(u => u.id === storedUser) : undefined;
        if (!found && storedUser) {
          // Sesión de jugador (usuario sintético: id = jugador.id)
          const pj = jugs.find(j => j.id === storedUser);
          if (pj) found = toJugadorUsuario(pj, jugs);
        }
        if (found) {
          setCurrentUser(found);
        } else {
          localStorage.removeItem('cf_current_user_id');
        }
      } else if (currentUser) {
        const refreshed = sanitizedUsrs.find(u => u.id === currentUser.id);
        if (refreshed) {
          setCurrentUser(refreshed);
        } else if (currentUser.rol === 'jugador') {
          const pj = jugs.find(j => j.id === currentUser.id);
          if (pj) setCurrentUser(toJugadorUsuario(pj, jugs));
        }
      }
    } catch (err) {
      console.error('Error al cargar datos del club:', err);
      addToast({
        type: 'error',
        title: 'Error de sincronización',
        message: 'No se pudieron sincronizar todos los datos. Mostrando copia local.'
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, currentUser]);

  useEffect(() => {
    refreshAll();
  }, []);

  const updateGasUrl = useCallback((url: string) => {
    setGasUrlStore(url);
    setGasUrlState(url);
    addToast({
      type: 'info',
      title: 'Configuración actualizada',
      message: url ? 'URL de backend guardada.' : 'Modo local sin conexión activado.'
    });
    refreshAll();
  }, [addToast, refreshAll]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const target = email.trim().toLowerCase();

    // 1) Personal del club: por correo electrónico (tabla usuarios)
    const found = users.find(u => u.email.trim().toLowerCase() === target);
    if (found) {
      if (!found.password || found.password !== password) {
        addToast({
          type: 'error',
          title: 'Acceso denegado',
          message: 'El correo electrónico o la contraseña no son correctos.'
        });
        return false;
      }
      setCurrentUser(found);
      localStorage.setItem('cf_current_user_id', found.id);
      const teamInfo = (found.rol === 'entrenador' || found.rol === 'jugador') && found.equipo ? ` - ${found.equipo}` : '';
      addToast({
        type: 'success',
        title: 'Sesión iniciada',
        message: `Bienvenido, ${found.nombre} (${found.rol.toUpperCase()}${teamInfo})`
      });
      return true;
    }

    // 2) Jugadores: usuario = nombre.lower + '.' + dorsal (ej: sergio.21), pass = el suyo o 123456
    const pj = jugadores.find(j => getJugadorUsuario(j, jugadores) === target);
    if (pj) {
      const expectedPass = pj.pass && pj.pass.trim() ? pj.pass.trim() : '123456';
      if (password === expectedPass) {
        const jugadorUser = toJugadorUsuario(pj, jugadores);
        setCurrentUser(jugadorUser);
        localStorage.setItem('cf_current_user_id', jugadorUser.id);
        addToast({
          type: 'success',
          title: 'Sesión iniciada',
          message: `Bienvenido, ${pj.nombre} (JUGADOR${jugadorUser.equipo ? ` - ${jugadorUser.equipo}` : ''})`
        });
        return true;
      }
    }

    addToast({
      type: 'error',
      title: 'Acceso denegado',
      message: 'El correo, el usuario o la contraseña no son correctos.'
    });
    return false;
  }, [addToast, users, jugadores]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('cf_current_user_id');
    addToast({
      type: 'info',
      title: 'Sesión cerrada',
      message: 'Has salido de tu cuenta de forma segura.'
    });
  }, [addToast]);

  // Permisos del usuario activo
  const can = useCallback((permission: Permission): boolean => {
    return canRole(currentUser?.rol, permission);
  }, [currentUser?.rol]);

  const allowedTabs = useMemo(() => {
    return allowedTabsFor(currentUser?.rol);
  }, [currentUser?.rol]);

  // CRUD Jugador
  const saveJugador = useCallback(async (jugador: Partial<Jugador>): Promise<boolean> => {
    try {
      if (jugador.id) {
        const updated = await jugadoresService.update(jugador as Jugador);
        setJugadores(prev => prev.map(j => j.id === updated.id ? updated : j));
        addToast({ type: 'success', title: 'Jugador actualizado', message: `${updated.nombre} modificado con éxito.` });
      } else {
        const created = await jugadoresService.create(jugador as Omit<Jugador, 'id'>);
        setJugadores(prev => [...prev, created]);
        // Crear registro de estadísticas inicial si no existe
        await estadisticasService.create({
          jugadorId: created.id,
          goles: 0,
          asistencias: 0,
          tarjetas: 0,
          partidosJugados: 0
        });
        setEstadisticas(prev => [...prev, {
          id: 'est_' + created.id,
          jugadorId: created.id,
          goles: 0,
          asistencias: 0,
          tarjetas: 0,
          partidosJugados: 0
        }]);
        addToast({ type: 'success', title: 'Jugador añadido', message: `${created.nombre} registrado con éxito.` });
      }
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo guardar el jugador.' });
      return false;
    }
  }, [addToast]);

  const deleteJugador = useCallback(async (id: string): Promise<boolean> => {
    try {
      await jugadoresService.delete(id);
      setJugadores(prev => prev.filter(j => j.id !== id));
      addToast({ type: 'info', title: 'Jugador eliminado', message: 'El jugador ha sido dado de baja.' });
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el jugador.' });
      return false;
    }
  }, [addToast]);

  // CRUD Equipos
  const saveEquipo = useCallback(async (equipo: Partial<Equipo>): Promise<boolean> => {
    try {
      const payload = {
        ...equipo,
        escudo: equipo.escudo?.trim() || clubConfig.escudo
      };
      if (payload.id) {
        const updated = await equiposService.update(payload as Equipo);
        setEquipos(prev => prev.map(e => e.id === updated.id ? updated : e));
      } else {
        const created = await equiposService.create(payload as Omit<Equipo, 'id'>);
        setEquipos(prev => [...prev, created]);
      }
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo guardar el equipo.' });
      return false;
    }
  }, [addToast, clubConfig.escudo]);

  const deleteEquipo = useCallback(async (id: string): Promise<boolean> => {
    try {
      await equiposService.delete(id);
      setEquipos(prev => prev.filter(e => e.id !== id));
      addToast({ type: 'info', title: 'Equipo eliminado', message: 'Equipo eliminado del club.' });
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el equipo.' });
      return false;
    }
  }, [addToast]);

  // CRUD Categorías
  const saveCategoria = useCallback(async (categoria: Partial<Categoria>): Promise<boolean> => {
    try {
      if (categoria.id) {
        const updated = await categoriasService.update(categoria as Categoria);
        setCategorias(prev => prev.map(c => c.id === updated.id ? updated : c));
        addToast({ type: 'success', title: 'Categoría actualizada', message: updated.nombre });
      } else {
        const created = await categoriasService.create(categoria as Omit<Categoria, 'id'>);
        setCategorias(prev => [...prev, created]);
        addToast({ type: 'success', title: 'Categoría creada', message: created.nombre });
      }
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo guardar la categoría.' });
      return false;
    }
  }, [addToast]);

  const deleteCategoria = useCallback(async (id: string): Promise<boolean> => {
    try {
      await categoriasService.delete(id);
      setCategorias(prev => prev.filter(c => c.id !== id));
      addToast({ type: 'info', title: 'Categoría eliminada', message: 'Categoría retirada.' });
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar la categoría.' });
      return false;
    }
  }, [addToast]);

  // CRUD Entrenadores
  const saveEntrenador = useCallback(async (entrenador: Partial<Entrenador>): Promise<boolean> => {
    try {
      if (entrenador.id) {
        const updated = await entrenadoresService.update(entrenador as Entrenador);
        setEntrenadores(prev => prev.map(e => e.id === updated.id ? updated : e));
        addToast({ type: 'success', title: 'Entrenador actualizado', message: updated.nombre });
      } else {
        const created = await entrenadoresService.create(entrenador as Omit<Entrenador, 'id'>);
        setEntrenadores(prev => [...prev, created]);
        addToast({ type: 'success', title: 'Entrenador añadido', message: created.nombre });
      }
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo guardar el entrenador.' });
      return false;
    }
  }, [addToast]);

  const deleteEntrenador = useCallback(async (id: string): Promise<boolean> => {
    try {
      await entrenadoresService.delete(id);
      setEntrenadores(prev => prev.filter(e => e.id !== id));
      addToast({ type: 'info', title: 'Entrenador eliminado', message: 'Entrenador retirado.' });
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el entrenador.' });
      return false;
    }
  }, [addToast]);

  // CRUD Partidos
  const savePartido = useCallback(async (partido: Partial<Partido>): Promise<boolean> => {
    try {
      if (partido.id) {
        const updated = await partidosService.update(partido as Partido);
        setPartidos(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await partidosService.create(partido as Omit<Partido, 'id'>);
        setPartidos(prev => [...prev, created]);
      }
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo guardar el partido.' });
      return false;
    }
  }, [addToast]);

  const deletePartido = useCallback(async (id: string): Promise<boolean> => {
    try {
      await partidosService.delete(id);
      setPartidos(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el partido.' });
      return false;
    }
  }, [addToast]);

  // CRUD Sesiones de Entrenamiento
  const saveSesion = useCallback(async (sesion: Partial<SesionEntrenamiento>): Promise<boolean> => {
    try {
      if (sesion.id) {
        const updated = await sesionesService.update(sesion as SesionEntrenamiento);
        setSesiones(prev => prev.map(s => s.id === updated.id ? updated : s));
        addToast({ type: 'success', title: 'Sesión actualizada', message: `${updated.equipo || ''} · ${updated.fecha}` });
      } else {
        const created = await sesionesService.create(sesion as Omit<SesionEntrenamiento, 'id'>);
        setSesiones(prev => [...prev, created]);
        addToast({ type: 'success', title: 'Sesión programada', message: `${created.equipo || ''} · ${created.fecha}` });
      }
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo guardar la sesión.' });
      return false;
    }
  }, [addToast]);

  const deleteSesion = useCallback(async (id: string): Promise<boolean> => {
    try {
      await sesionesService.delete(id);
      setSesiones(prev => prev.filter(s => s.id !== id));
      addToast({ type: 'info', title: 'Sesión eliminada', message: 'Sesión retirada del calendario de entrenamientos.' });
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar la sesión.' });
      return false;
    }
  }, [addToast]);

  // Estadísticas
  const saveEstadistica = useCallback(async (stat: Partial<Estadistica> & { jugadorId: string }): Promise<boolean> => {
    try {
      const existing = estadisticas.find(s => s.jugadorId === stat.jugadorId);
      if (existing) {
        const updated = await estadisticasService.update({
          ...existing,
          ...stat,
          goles: Number(stat.goles ?? existing.goles),
          asistencias: Number(stat.asistencias ?? existing.asistencias),
          tarjetas: Number(stat.tarjetas ?? existing.tarjetas),
          partidosJugados: Number(stat.partidosJugados ?? existing.partidosJugados)
        });
        setEstadisticas(prev => prev.map(s => s.id === updated.id ? updated : s));
      } else {
        const created = await estadisticasService.create({
          jugadorId: stat.jugadorId,
          goles: Number(stat.goles || 0),
          asistencias: Number(stat.asistencias || 0),
          tarjetas: Number(stat.tarjetas || 0),
          partidosJugados: Number(stat.partidosJugados || 0)
        });
        setEstadisticas(prev => [...prev, created]);
      }
      addToast({ type: 'success', title: 'Estadísticas guardadas', message: 'Datos actualizados en el ranking.' });
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudieron guardar las estadísticas.' });
      return false;
    }
  }, [addToast, estadisticas]);

  /** Deltas de jugadores → estadísticas (convocatoria/alineación/eventos; sign +1 aplica, -1 revierte) */
  const applyEventStats = useCallback(async (deltas: PlayerStatsDelta[], sign: 1 | -1): Promise<boolean> => {
    if (!deltas.length) return true;
    try {
      const saved: Estadistica[] = [];
      for (const d of deltas) {
        const existing = estadisticas.find(s => s.jugadorId === d.jugadorId);
        const next: Estadistica = {
          id: existing?.id || '',
          jugadorId: d.jugadorId,
          temporada: existing?.temporada,
          goles: Math.max(0, (Number(existing?.goles) || 0) + sign * d.goles),
          asistencias: Math.max(0, (Number(existing?.asistencias) || 0) + sign * d.asistencias),
          tarjetas: Math.max(0, (Number(existing?.tarjetas) || 0) + sign * d.tarjetas),
          tarjetasAmarillas: Math.max(0, (Number(existing?.tarjetasAmarillas) || 0) + sign * d.tarjetasAmarillas),
          tarjetasRojas: Math.max(0, (Number(existing?.tarjetasRojas) || 0) + sign * d.tarjetasRojas),
          partidosJugados: Math.max(0, (Number(existing?.partidosJugados) || 0) + sign * d.partidosJugados),
          titular: Math.max(0, (Number(existing?.titular) || 0) + sign * d.titular),
          historico: existing?.historico
        };
        if (existing) {
          saved.push(await estadisticasService.update(next));
        } else {
          const created = await estadisticasService.create({
            jugadorId: next.jugadorId,
            temporada: next.temporada,
            goles: next.goles,
            asistencias: next.asistencias,
            tarjetas: next.tarjetas,
            tarjetasAmarillas: next.tarjetasAmarillas,
            tarjetasRojas: next.tarjetasRojas,
            partidosJugados: next.partidosJugados,
            titular: next.titular,
            historico: next.historico
          });
          saved.push(created);
        }
      }
      const map = new Map<string, Estadistica>();
      estadisticas.forEach(s => map.set(s.jugadorId, s));
      saved.forEach(s => {
        const cur = map.get(s.jugadorId);
        map.set(s.jugadorId, cur ? { ...cur, ...s, id: s.id || cur.id } : s);
      });
      setEstadisticas(Array.from(map.values()));
      return true;
    } catch (err) {
      console.error('[applyEventStats]', err);
      return false;
    }
  }, [estadisticas]);

  // Convocatorias (suman/reversan +1 partido jugado en estadísticas)
  const asIdList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string') : [];

  const toggleConvocatoria = useCallback(async (partidoId: string, jugadorId: string): Promise<void> => {
    const partido = partidos.find(p => p.id === partidoId);
    if (!partido) return;
    const prev = asIdList(partido.convocados);
    const updatedConvocados = prev.includes(jugadorId)
      ? prev.filter(id => id !== jugadorId)
      : [...prev, jugadorId];
    await savePartido({ ...partido, convocados: updatedConvocados });
    const deltas = convocatoriaStatsDeltas(prev, updatedConvocados, asIdList(partido.titulares));
    if (deltas.length) await applyEventStats(deltas, 1);
  }, [partidos, savePartido, applyEventStats]);

  const setConvocatoriaEstado = useCallback(async (partidoId: string, jugadorId: string, estado: EstadoConvocatoria): Promise<void> => {
    const partido = partidos.find(p => p.id === partidoId);
    if (!partido) return;
    const prev = asIdList(partido.convocados);
    let updatedConvocados = [...prev];
    if (estado === 'convocado' && !updatedConvocados.includes(jugadorId)) {
      updatedConvocados.push(jugadorId);
    } else if (estado === 'no convocado') {
      updatedConvocados = updatedConvocados.filter(id => id !== jugadorId);
    }
    await savePartido({ ...partido, convocados: updatedConvocados });
    const deltas = convocatoriaStatsDeltas(prev, updatedConvocados, asIdList(partido.titulares));
    if (deltas.length) await applyEventStats(deltas, 1);
  }, [partidos, savePartido, applyEventStats]);

  const batchSetConvocatoriaEstado = useCallback(async (partidoId: string, jugadorIds: string[], estado: EstadoConvocatoria): Promise<void> => {
    const partido = partidos.find(p => p.id === partidoId);
    if (!partido) return;
    const prev = asIdList(partido.convocados);
    const current = new Set(prev);
    if (estado === 'convocado') {
      jugadorIds.forEach(id => current.add(id));
    } else {
      jugadorIds.forEach(id => current.delete(id));
    }
    const updated = Array.from(current);
    await savePartido({ ...partido, convocados: updated });
    const deltas = convocatoriaStatsDeltas(prev, updated, asIdList(partido.titulares));
    if (deltas.length) await applyEventStats(deltas, 1);
  }, [partidos, savePartido, applyEventStats]);

  // Asistencias
  const saveAsistencia = useCallback(async (asistencia: Partial<Asistencia>): Promise<boolean> => {
    try {
      if (asistencia.id) {
        const updated = await asistenciasService.update(asistencia as Asistencia);
        setAsistencias(prev => prev.map(a => a.id === updated.id ? updated : a));
      } else {
        const created = await asistenciasService.create(asistencia as Omit<Asistencia, 'id'>);
        setAsistencias(prev => [...prev, created]);
      }
      addToast({ type: 'success', title: 'Asistencia guardada', message: 'Registro actualizado.' });
      return true;
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo guardar la asistencia.' });
      return false;
    }
  }, [addToast]);

  const deleteAsistencia = useCallback(async (id: string): Promise<boolean> => {
    try {
      await asistenciasService.delete(id);
      setAsistencias(prev => prev.filter(a => a.id !== id));
      return true;
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar la asistencia.' });
      return false;
    }
  }, [addToast]);

  const toggleAsistencia = useCallback(async (jugadorId: string, fecha: string, estado: EstadoAsistencia): Promise<void> => {
    const existing = asistencias.find(a => a.jugadorId === jugadorId && a.fecha === fecha);
    if (existing) {
      const updated = await asistenciasService.update({ ...existing, estado });
      setAsistencias(prev => prev.map(a => a.id === updated.id ? updated : a));
    } else {
      const created = await asistenciasService.create({ jugadorId, fecha, estado });
      setAsistencias(prev => [...prev, created]);
    }
  }, [asistencias]);

  const batchMarkAsistencia = useCallback(async (fecha: string, jugadorIds: string[], estado: EstadoAsistencia): Promise<void> => {
    for (const jId of jugadorIds) {
      await toggleAsistencia(jId, fecha, estado);
    }
    addToast({
      type: 'success',
      title: 'Asistencias actualizadas',
      message: `Marcados ${jugadorIds.length} jugadores como "${estado}".`
    });
  }, [addToast, toggleAsistencia]);

  // Exportar a Excel/CSV
  const exportSheet = useCallback((sheetName: string): void => {
    let rows: Record<string, unknown>[] = [];
    switch (sheetName) {
      case 'jugadores':
        rows = visibleJugadores.map(j => ({ ...j }));
        break;
      case 'equipos':
        rows = visibleEquipos.map(e => ({ ...e }));
        break;
      case 'categorias':
        rows = visibleCategorias.map(c => ({ ...c }));
        break;
      case 'entrenadores':
        rows = visibleEntrenadores.map(e => ({ ...e }));
        break;
      case 'partidos':
        rows = visiblePartidos.map(p => ({ ...p }));
        break;
      case 'asistencias':
        rows = visibleAsistencias.map(a => ({ ...a }));
        break;
      case 'estadisticas':
        rows = visibleEstadisticas.map(s => ({ ...s }));
        break;
      case 'sesiones':
        rows = visibleSesiones.map(s => ({ ...s }));
        break;
      case 'usuarios':
        rows = users.map(u => ({ ...u }));
        break;
      default:
        rows = [];
    }

    if (rows.length === 0) {
      addToast({ type: 'info', title: 'Sin datos', message: `No hay registros en "${sheetName}" para exportar.` });
      return;
    }

    exportToCsv(`club_futbol_${sheetName}`, rows);
    addToast({ type: 'success', title: 'Exportación completada', message: `Archivo CSV descargado: ${sheetName}` });
  }, [
    addToast,
    visibleJugadores,
    visibleEquipos,
    visibleCategorias,
    visibleEntrenadores,
    visiblePartidos,
    visibleAsistencias,
    visibleEstadisticas,
    visibleSesiones,
    users
  ]);

  const testGoogleConnection = useCallback((targetUrl?: string) => {
    return apiClient.testConnection(targetUrl);
  }, []);

  const initRemoteSheets = useCallback(() => {
    return apiClient.initRemoteDatabase();
  }, []);

  const saveUser = useCallback(async (user: Partial<Usuario>): Promise<boolean> => {
    try {
      if ((user.rol === 'entrenador' || user.rol === 'jugador') && !user.equipo) {
        addToast({
          type: 'error',
          title: 'Equipo requerido',
          message: `El rol "${user.rol}" debe estar asignado a un equipo registrado.`
        });
        return false;
      }

      if (user.email) {
        const normalized = user.email.trim().toLowerCase();
        const emailTaken = users.some(
          u => u.id !== user.id && u.email.trim().toLowerCase() === normalized
        );
        if (emailTaken) {
          addToast({
            type: 'error',
            title: 'Correo duplicado',
            message: 'Ya existe un usuario registrado con este correo electrónico.'
          });
          return false;
        }
      }

      if (user.id) {
        const updated = await usuariosService.update(user as Usuario);
        setUsers(prev => prev.map(u => (u.id === user.id ? updated : u)));
        if (currentUser?.id === user.id) {
          setCurrentUser(updated);
        }
        addToast({ type: 'success', title: 'Usuario actualizado', message: `${updated.nombre} ha sido modificado.` });
      } else {
        const created = await usuariosService.create(user as any);
        setUsers(prev => [...prev, created]);
        addToast({ type: 'success', title: 'Usuario creado', message: `${created.nombre} ha sido registrado.` });
      }
      return true;
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error al guardar usuario', message: e.message || 'No se pudo guardar el usuario.' });
      return false;
    }
  }, [addToast, currentUser?.id, users]);

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    try {
      await usuariosService.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      addToast({ type: 'info', title: 'Usuario eliminado', message: 'El usuario ha sido removido.' });
      return true;
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error al eliminar', message: e.message || 'No se pudo eliminar el usuario.' });
      return false;
    }
  }, [addToast]);

  const exportAllSheets = useCallback(() => {
    const allSheets = [
      'jugadores',
      'equipos',
      'categorias',
      'entrenadores',
      'partidos',
      'asistencias',
      'estadisticas',
      'usuarios'
    ];
    allSheets.forEach(sheet => {
      exportSheet(sheet);
    });
    addToast({
      type: 'success',
      title: 'Exportación completa',
      message: 'Se han descargado las 8 hojas en formato CSV.'
    });
  }, [addToast, exportSheet]);

  const resetDatabase = useCallback(() => {
    apiClient.resetLocalDatabase();
    refreshAll();
    addToast({ type: 'info', title: 'Base de datos restaurada', message: 'Se han recargado los datos predeterminados.' });
  }, [addToast, refreshAll]);

  const value = useMemo<ClubContextType>(() => ({
    currentUser,
    setCurrentUser,
    users,
    login,
    logout,
    can,
    allowedTabs,
    isTeamScoped,
    assignedTeams,

    jugadores: visibleJugadores,
    allJugadores: jugadores,
    equipos: visibleEquipos,
    categorias: visibleCategorias,
    entrenadores: visibleEntrenadores,
    partidos: visiblePartidos,
    asistencias: visibleAsistencias,
    estadisticas: visibleEstadisticas,
    sesiones: visibleSesiones,
    visibleSesiones,

    clubConfig,
    saveClubConfig,
    getTeamEscudo,

    loading,
    refreshAll,
    gasUrl,
    updateGasUrl,
    isOnlineConfigured: Boolean(getSupabaseUrl() && getSupabaseAnonKey()) || Boolean(gasUrl),
    testGoogleConnection,
    initRemoteSheets,
    resetDatabase,

    toasts,
    addToast,
    removeToast,

    saveJugador,
    deleteJugador,

    saveEquipo,
    deleteEquipo,

    saveCategoria,
    deleteCategoria,

    saveEntrenador,
    deleteEntrenador,

    savePartido,
    deletePartido,

    saveSesion,
    deleteSesion,

    toggleConvocatoria,
    setConvocatoriaEstado,
    batchSetConvocatoriaEstado,

    saveAsistencia,
    deleteAsistencia,
    toggleAsistencia,
    batchMarkAsistencia,

    saveEstadistica,
    applyEventStats,

    submitApuesta: async () => false,
    deleteApuesta: async () => false,

    isConfigModalOpen,
    setIsConfigModalOpen,
    googleScriptUrl: gasUrl,
    setGoogleScriptUrl: updateGasUrl,
    syncAllData: refreshAll,
    resetDataToMock: resetDatabase,
    exportAllSheets,

    saveUser,
    deleteUser,

    exportSheet
  }), [
    currentUser, users, login, logout, can, allowedTabs, isTeamScoped, assignedTeams,
    jugadores, visibleJugadores, visibleEquipos, visibleCategorias, visibleEntrenadores,
    visiblePartidos, visibleAsistencias, visibleEstadisticas, visibleSesiones,
    clubConfig, saveClubConfig, getTeamEscudo,
    loading, refreshAll, gasUrl, updateGasUrl, testGoogleConnection, initRemoteSheets, resetDatabase,
    toasts, addToast, removeToast,
    saveJugador, deleteJugador, saveEquipo, deleteEquipo, saveCategoria, deleteCategoria,
    saveEntrenador, deleteEntrenador, savePartido, deletePartido, saveSesion, deleteSesion,
    toggleConvocatoria, setConvocatoriaEstado, batchSetConvocatoriaEstado,
    saveAsistencia, deleteAsistencia, toggleAsistencia, batchMarkAsistencia, saveEstadistica, applyEventStats,
    isConfigModalOpen, setIsConfigModalOpen, exportAllSheets,
    saveUser, deleteUser, exportSheet
  ]);

  return (
    <ClubContext.Provider value={value}>
      {children}
    </ClubContext.Provider>
  );
};

export const useClub = (): ClubContextType => {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub debe usarse dentro de un ClubProvider');
  }
  return context;
};