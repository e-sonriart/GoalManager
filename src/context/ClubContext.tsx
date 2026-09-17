import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
  ClubConfig
} from '../types';
import { DEFAULT_CLUB_SHIELD } from '../utils/shieldPresets';
import { jugadoresService } from '../services/jugadores';
import { equiposService } from '../services/equipos';
import { categoriasService } from '../services/categorias';
import { entrenadoresService } from '../services/entrenadores';
import { partidosService } from '../services/partidos';
import { asistenciasService } from '../services/asistencias';
import { estadisticasService } from '../services/estadisticas';
import { usuariosService } from '../services/usuarios';
import { apiClient, getGasUrl, setGasUrl as setGasUrlStore } from '../services/apiClient';
import { exportToCsv } from '../utils/exportUtils';

interface ClubContextType {
  // Estado de usuario y autenticación
  currentUser: Usuario | null;
  setCurrentUser: (user: Usuario | null) => void;
  users: Usuario[];
  loginAs: (userId: string) => void;
  registerUser: (nombre: string, email: string, rol: RolUsuario, equipo?: string) => Promise<boolean>;

  // Entidades principales
  jugadores: Jugador[];
  equipos: Equipo[];
  categorias: Categoria[];
  entrenadores: Entrenador[];
  partidos: Partido[];
  asistencias: Asistencia[];
  estadisticas: Estadistica[];

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

  // Convocatorias
  toggleConvocatoria: (partidoId: string, jugadorId: string) => Promise<void>;
  setConvocatoriaEstado: (partidoId: string, jugadorId: string, estado: EstadoConvocatoria) => Promise<void>;

  // Asistencias
  toggleAsistencia: (jugadorId: string, fecha: string, estado: EstadoAsistencia) => Promise<void>;
  batchMarkAsistencia: (fecha: string, jugadorIds: string[], estado: EstadoAsistencia) => Promise<void>;

  // Estadísticas
  saveEstadistica: (estadistica: Partial<Estadistica> & { jugadorId: string }) => Promise<boolean>;

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

const ClubContext = createContext<ClubContextType | undefined>(undefined);

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
  const [users, setUsers] = useState<Usuario[]>([]);

  // Configuración e Identidad del Club
  const [clubConfig, setClubConfig] = useState<ClubConfig>(() => {
    const defaultConfig: ClubConfig = {
      nombre: 'Club de Fútbol Naranja',
      escudo: DEFAULT_CLUB_SHIELD,
      acronimo: 'CFN',
      lema: 'Pasión, disciplina y victoria',
      temporada: '2025/2026'
    };
    try {
      const saved = localStorage.getItem('cf_club_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultConfig, ...parsed };
      }
    } catch {
      // ignore
    }
    return defaultConfig;
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
    setClubConfig(prev => {
      const merged = { ...prev, ...newConfig };
      localStorage.setItem('cf_club_config', JSON.stringify(merged));
      return merged;
    });
    addToast({
      type: 'success',
      title: 'Identidad Actualizada',
      message: 'El nombre y escudo del club han sido guardados correctamente.'
    });
  }, [addToast]);

  const getTeamEscudo = useCallback((teamName: string): string => {
    if (!teamName) return clubConfig.escudo;
    const clean = teamName.toLowerCase().trim();
    // Búsqueda en equipos registrados del club
    const match = equipos.find(
      e => e.nombre.toLowerCase().trim() === clean
    );
    if (match) {
      return match.escudo || clubConfig.escudo;
    }
    return clubConfig.escudo;
  }, [equipos, clubConfig]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        jugs,
        eqs,
        cats,
        ents,
        pars,
        asists,
        stats,
        usrs
      ] = await Promise.all([
        jugadoresService.getAll(),
        equiposService.getAll(),
        categoriasService.getAll(),
        entrenadoresService.getAll(),
        partidosService.getAll(),
        asistenciasService.getAll(),
        estadisticasService.getAll(),
        usuariosService.getAll()
      ]);

      setJugadores(jugs);
      setEquipos(eqs);
      setCategorias(cats);
      setEntrenadores(ents);
      setPartidos(pars);
      setAsistencias(asists);
      setEstadisticas(stats);
      // Asegurar que jugadores y entrenadores tengan un equipo asignado de los registrados
      const defaultTeam = eqs[0]?.nombre || 'Club Naranja Principal';
      const sanitizedUsrs = usrs.map(u => {
        if ((u.rol === 'entrenador' || u.rol === 'jugador') && !u.equipo) {
          if (u.rol === 'entrenador') {
            const match = eqs.find(e => e.entrenador && (e.entrenador.toLowerCase().includes(u.nombre.toLowerCase()) || u.nombre.toLowerCase().includes(e.entrenador.toLowerCase())));
            return { ...u, equipo: match ? match.nombre : defaultTeam };
          }
          if (u.rol === 'jugador') {
            const match = jugs.find(j => j.nombre && (j.nombre.toLowerCase().includes(u.nombre.toLowerCase()) || u.nombre.toLowerCase().includes(j.nombre.toLowerCase())));
            return { ...u, equipo: match ? match.equipo : defaultTeam };
          }
          return { ...u, equipo: defaultTeam };
        }
        return u;
      });

      setUsers(sanitizedUsrs);

      // Si no hay usuario activo, seleccionar el primer admin por defecto
      if (!currentUser && sanitizedUsrs.length > 0) {
        const storedUser = localStorage.getItem('cf_current_user_id');
        const found = sanitizedUsrs.find(u => u.id === storedUser) || sanitizedUsrs[0];
        setCurrentUser(found);
      } else if (currentUser) {
        const refreshed = sanitizedUsrs.find(u => u.id === currentUser.id);
        if (refreshed) setCurrentUser(refreshed);
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

  const updateGasUrl = (url: string) => {
    setGasUrlStore(url);
    setGasUrlState(url);
    addToast({
      type: 'info',
      title: 'Configuración actualizada',
      message: url ? 'URL de Google Apps Script guardada.' : 'Modo local sin conexión activado.'
    });
    refreshAll();
  };

  const loginAs = (userId: string) => {
    const found = users.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('cf_current_user_id', found.id);
      const teamInfo = (found.rol === 'entrenador' || found.rol === 'jugador') && found.equipo ? ` - ${found.equipo}` : '';
      addToast({
        type: 'success',
        title: 'Sesión iniciada',
        message: `Bienvenido, ${found.nombre} (${found.rol.toUpperCase()}${teamInfo})`
      });
    }
  };

  const registerUser = async (nombre: string, email: string, rol: RolUsuario, equipo?: string): Promise<boolean> => {
    try {
      if ((rol === 'entrenador' || rol === 'jugador') && !equipo) {
        addToast({
          type: 'error',
          title: 'Equipo requerido',
          message: `Los usuarios con rol de ${rol} deben ser asignados obligatoriamente a un equipo registrado.`
        });
        return false;
      }

      const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        addToast({
          type: 'error',
          title: 'Usuario existente',
          message: 'Ya existe un usuario con este correo electrónico.'
        });
        return false;
      }

      const userData: Omit<Usuario, 'id'> = {
        nombre,
        email,
        rol,
        ...(equipo ? { equipo } : {})
      };

      const newUser = await usuariosService.create(userData);
      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      localStorage.setItem('cf_current_user_id', newUser.id);
      addToast({
        type: 'success',
        title: 'Registro exitoso',
        message: `Usuario ${nombre} creado y asignado a ${equipo || 'el club'}.`
      });
      return true;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error de registro',
        message: 'No se pudo crear el usuario.'
      });
      return false;
    }
  };

  // CRUD Jugador
  const saveJugador = async (jugador: Partial<Jugador>): Promise<boolean> => {
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
  };

  const deleteJugador = async (id: string): Promise<boolean> => {
    try {
      await jugadoresService.delete(id);
      setJugadores(prev => prev.filter(j => j.id !== id));
      addToast({ type: 'info', title: 'Jugador eliminado', message: 'El jugador ha sido dado de baja.' });
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el jugador.' });
      return false;
    }
  };

  // CRUD Equipos
  const saveEquipo = async (equipo: Partial<Equipo>): Promise<boolean> => {
    try {
      const payload = {
        ...equipo,
        escudo: equipo.escudo?.trim() || clubConfig.escudo
      };
      if (payload.id) {
        const updated = await equiposService.update(payload as Equipo);
        setEquipos(prev => prev.map(e => e.id === updated.id ? updated : e));
        addToast({ type: 'success', title: 'Equipo actualizado', message: `${updated.nombre} guardado.` });
      } else {
        const created = await equiposService.create(payload as Omit<Equipo, 'id'>);
        setEquipos(prev => [...prev, created]);
        addToast({ type: 'success', title: 'Equipo creado', message: `${created.nombre} registrado.` });
      }
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo guardar el equipo.' });
      return false;
    }
  };

  const deleteEquipo = async (id: string): Promise<boolean> => {
    try {
      await equiposService.delete(id);
      setEquipos(prev => prev.filter(e => e.id !== id));
      addToast({ type: 'info', title: 'Equipo eliminado', message: 'Equipo eliminado del club.' });
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el equipo.' });
      return false;
    }
  };

  // CRUD Categorías
  const saveCategoria = async (categoria: Partial<Categoria>): Promise<boolean> => {
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
  };

  const deleteCategoria = async (id: string): Promise<boolean> => {
    try {
      await categoriasService.delete(id);
      setCategorias(prev => prev.filter(c => c.id !== id));
      addToast({ type: 'info', title: 'Categoría eliminada', message: 'Categoría retirada.' });
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar la categoría.' });
      return false;
    }
  };

  // CRUD Entrenadores
  const saveEntrenador = async (entrenador: Partial<Entrenador>): Promise<boolean> => {
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
  };

  const deleteEntrenador = async (id: string): Promise<boolean> => {
    try {
      await entrenadoresService.delete(id);
      setEntrenadores(prev => prev.filter(e => e.id !== id));
      addToast({ type: 'info', title: 'Entrenador eliminado', message: 'Entrenador retirado.' });
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el entrenador.' });
      return false;
    }
  };

  // CRUD Partidos
  const savePartido = async (partido: Partial<Partido>): Promise<boolean> => {
    try {
      if (partido.id) {
        const updated = await partidosService.update(partido as Partido);
        setPartidos(prev => prev.map(p => p.id === updated.id ? updated : p));
        addToast({ type: 'success', title: 'Partido actualizado', message: `${updated.local} vs ${updated.visitante}` });
      } else {
        const created = await partidosService.create(partido as Omit<Partido, 'id'>);
        setPartidos(prev => [...prev, created]);
        addToast({ type: 'success', title: 'Partido programado', message: `${created.local} vs ${created.visitante}` });
      }
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo guardar el partido.' });
      return false;
    }
  };

  const deletePartido = async (id: string): Promise<boolean> => {
    try {
      await partidosService.delete(id);
      setPartidos(prev => prev.filter(p => p.id !== id));
      addToast({ type: 'info', title: 'Partido eliminado', message: 'Partido retirado del calendario.' });
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el partido.' });
      return false;
    }
  };

  // Convocatorias
  const toggleConvocatoria = async (partidoId: string, jugadorId: string): Promise<void> => {
    const partido = partidos.find(p => p.id === partidoId);
    if (!partido) return;
    const current = partido.convocados || [];
    const updatedConvocados = current.includes(jugadorId)
      ? current.filter(id => id !== jugadorId)
      : [...current, jugadorId];
    await savePartido({ ...partido, convocados: updatedConvocados });
  };

  const setConvocatoriaEstado = async (partidoId: string, jugadorId: string, estado: EstadoConvocatoria): Promise<void> => {
    const partido = partidos.find(p => p.id === partidoId);
    if (!partido) return;
    const current = partido.convocados || [];
    let updatedConvocados = [...current];
    if (estado === 'convocado' && !updatedConvocados.includes(jugadorId)) {
      updatedConvocados.push(jugadorId);
    } else if (estado === 'no convocado') {
      updatedConvocados = updatedConvocados.filter(id => id !== jugadorId);
    }
    await savePartido({ ...partido, convocados: updatedConvocados });
  };

  // Asistencias
  const toggleAsistencia = async (jugadorId: string, fecha: string, estado: EstadoAsistencia): Promise<void> => {
    const existing = asistencias.find(a => a.jugadorId === jugadorId && a.fecha === fecha);
    if (existing) {
      const updated = await asistenciasService.update({ ...existing, estado });
      setAsistencias(prev => prev.map(a => a.id === updated.id ? updated : a));
    } else {
      const created = await asistenciasService.create({ jugadorId, fecha, estado });
      setAsistencias(prev => [...prev, created]);
    }
  };

  const batchMarkAsistencia = async (fecha: string, jugadorIds: string[], estado: EstadoAsistencia): Promise<void> => {
    for (const jId of jugadorIds) {
      await toggleAsistencia(jId, fecha, estado);
    }
    addToast({
      type: 'success',
      title: 'Asistencias actualizadas',
      message: `Marcados ${jugadorIds.length} jugadores como "${estado}".`
    });
  };

  // Estadísticas
  const saveEstadistica = async (stat: Partial<Estadistica> & { jugadorId: string }): Promise<boolean> => {
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
  };



  // Exportar a Excel/CSV
  const exportSheet = (sheetName: string): void => {
    let rows: Record<string, unknown>[] = [];
    switch (sheetName) {
      case 'jugadores':
        rows = jugadores.map(j => ({ ...j }));
        break;
      case 'equipos':
        rows = equipos.map(e => ({ ...e }));
        break;
      case 'categorias':
        rows = categorias.map(c => ({ ...c }));
        break;
      case 'entrenadores':
        rows = entrenadores.map(e => ({ ...e }));
        break;
      case 'partidos':
        rows = partidos.map(p => ({ ...p }));
        break;
      case 'asistencias':
        rows = asistencias.map(a => ({ ...a }));
        break;
      case 'estadisticas':
        rows = estadisticas.map(s => ({ ...s }));
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
  };

  const testGoogleConnection = async (targetUrl?: string) => {
    return apiClient.testConnection(targetUrl);
  };

  const initRemoteSheets = async () => {
    return apiClient.initRemoteDatabase();
  };

  const saveUser = async (user: Partial<Usuario>): Promise<boolean> => {
    try {
      if ((user.rol === 'entrenador' || user.rol === 'jugador') && !user.equipo) {
        addToast({
          type: 'error',
          title: 'Equipo requerido',
          message: `El rol "${user.rol}" debe estar asignado a un equipo registrado.`
        });
        return false;
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
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      await usuariosService.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      addToast({ type: 'info', title: 'Usuario eliminado', message: 'El usuario ha sido removido.' });
      return true;
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error al eliminar', message: e.message || 'No se pudo eliminar el usuario.' });
      return false;
    }
  };

  const exportAllSheets = () => {
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
  };

  const resetDatabase = () => {
    apiClient.resetLocalDatabase();
    refreshAll();
    addToast({ type: 'info', title: 'Base de datos restaurada', message: 'Se han recargado los datos predeterminados.' });
  };

  return (
    <ClubContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        loginAs,
        registerUser,

        jugadores,
        equipos,
        categorias,
        entrenadores,
        partidos,
        asistencias,
        estadisticas,

        clubConfig,
        saveClubConfig,
        getTeamEscudo,

        loading,
        refreshAll,
        gasUrl,
        updateGasUrl,
        isOnlineConfigured: Boolean(gasUrl),
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

        toggleConvocatoria,
        setConvocatoriaEstado,

        toggleAsistencia,
        batchMarkAsistencia,

        saveEstadistica,

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
      }}
    >
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
