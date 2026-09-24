import React, { useState, useEffect } from 'react';
import { useClub } from '../context/ClubContext';
import { User, RolUsuario, Categoria, Equipo, Entrenador, Jugador, Partido, TipoFutbol, Asistencia, Estadistica, EstadoAsistencia, PosicionJugador } from '../types';
import { Modal } from './Modal';
import { SHIELD_PRESETS, DEFAULT_CLUB_SHIELD } from '../utils/shieldPresets';
import { TeamShield } from './TeamShield';
import { RolePermissionsMatrix } from './RolePermissionsMatrix';
import { ROLE_ORDER, getRoleInfo, roleRequiresTeam, SCOPE_LABELS } from '../utils/roles';
import { validateUserForm } from '../utils/validation';
import { compareTeams } from '../utils/teamOrder';
import {
  Settings,
  Users,
  Database,
  RefreshCw,
  Download,
  Key,
  Trash2,
  Edit2,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Copy,
  ExternalLink,
  Code,
  Shield,
  Sparkles,
  Link2,
  Palette,
  Check,
  Plus,
  Search,
  Clock,
  Layers,
  Filter,
  ChevronDown
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const {
    users,
    jugadores,
    equipos,
    categorias,
    entrenadores,
    partidos,
    asistencias,
    estadisticas,
    googleScriptUrl,
    setGoogleScriptUrl,
    syncAllData,
    resetDataToMock,
    exportAllSheets,
    exportSheet,
    saveUser,
    deleteUser,
    saveCategoria,
    deleteCategoria,
    saveEquipo,
    deleteEquipo,
    saveEntrenador,
    deleteEntrenador,
    saveJugador,
    deleteJugador,
    savePartido,
    deletePartido,
    saveAsistencia,
    deleteAsistencia,
    saveEstadistica,
    getTeamEscudo,
    currentUser,
    addToast,
    clubConfig,
    saveClubConfig,
    can
  } = useClub();

  const canUsuarios = can('manage:usuarios');
  const canSync = can('manage:sincronizacion');
  const canIdentidad = can('manage:identidad');

  const [activeTab, setActiveTab] = useState<'identity' | 'database' | 'users' | 'appsScript'>('identity');

  // Estados de Personalización e Identidad del Club
  const [clubNombre, setClubNombre] = useState(clubConfig?.nombre || '');
  const [clubEscudo, setClubEscudo] = useState(clubConfig?.escudo || '');
  const [clubAcronimo, setClubAcronimo] = useState(clubConfig?.acronimo || '');
  const [clubLema, setClubLema] = useState(clubConfig?.lema || '');
  const [clubTemporada, setClubTemporada] = useState(clubConfig?.temporada || '2025/2026');

  // Sincronizar si cambia el contexto externamente
  useEffect(() => {
    if (clubConfig) {
      setClubNombre(clubConfig.nombre);
      setClubEscudo(clubConfig.escudo);
      setClubAcronimo(clubConfig.acronimo || '');
      setClubLema(clubConfig.lema || '');
      setClubTemporada(clubConfig.temporada || '2025/2026');
    }
  }, [clubConfig]);

  // Modal Usuario
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRol, setFormRol] = useState<RolUsuario>('entrenador');
  const [formEquipo, setFormEquipo] = useState('');
  const [formPassword, setFormPassword] = useState('');

  // Estados Visor y Editor Total de tablas Supabase
  const [selectedSheet, setSelectedSheet] = useState<string>('categorias');
  const [sheetSearch, setSheetSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  // Equipos colapsados en la hoja jugadores (cabeceras plegables)
  const [jugadoresEquiposAbiertos, setJugadoresEquiposAbiertos] = useState<Set<string>>(new Set());

  // Modal Categoría desde Administrador de Hojas
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Categoria | null>(null);
  const [catFormNombre, setCatFormNombre] = useState('');
  const [catFormTipo, setCatFormTipo] = useState<TipoFutbol>('F11');
  const [catFormTiempo, setCatFormTiempo] = useState<number>(45);

  // Modal genérico de edición/Alta para hojas del Admin
  type SheetModalKind = 'equipo' | 'jugador' | 'entrenador' | 'partido' | 'asistencia' | 'estadistica';
  const [sheetModalKind, setSheetModalKind] = useState<SheetModalKind | null>(null);
  const [editingSheetItem, setEditingSheetItem] = useState<Equipo | Jugador | Entrenador | Partido | Asistencia | Estadistica | null>(null);
  const [sf, setSf] = useState<Record<string, string>>({});

  const openSheetModal = (kind: SheetModalKind, item?: Equipo | Jugador | Entrenador | Partido | Asistencia | Estadistica | null) => {
    setSheetModalKind(kind);
    setEditingSheetItem(item ?? null);
    if (kind === 'equipo') {
      const eq = item as Equipo | undefined;
      setSf({
        nombre: eq?.nombre || '',
        categoria: eq?.categoria || categorias[0]?.nombre || '',
        letra: eq?.letra || 'A',
        division: eq?.division || '',
        grupo: eq?.grupo || '',
        linkClasificacion: eq?.linkClasificacion || '',
        entrenador: eq?.entrenador || '',
        escudo: eq?.escudo || ''
      });
    } else if (kind === 'jugador') {
      const j = item as Jugador | undefined;
      setSf({
        nombre: j?.nombre || '',
        dorsal: j?.dorsal !== undefined && j?.dorsal !== null ? String(j.dorsal) : '',
        posicion: j?.posicion || 'Delantero',
        categoria: j?.categoria || categorias[0]?.nombre || '',
        equipo: j ? (j.equipo || '') : (equipos[0]?.nombre || ''),
        fechaAlta: j?.fechaAlta || new Date().toISOString().split('T')[0]
      });
    } else if (kind === 'entrenador') {
      const ent = item as Entrenador | undefined;
      setSf({ nombre: ent?.nombre || '', telefono: ent?.telefono || '' });
    } else if (kind === 'partido') {
      const p = item as Partido | undefined;
      const clubTeam = p?.equipo || (p && equipos.some(e => e.nombre === p.local) ? p.local : p?.visitante) || equipos[0]?.nombre || '';
      const isClubLocal = p ? p.local === clubTeam : true;
      const cond = p?.condicion || (p ? (isClubLocal ? 'casa' : 'fuera') : 'casa');
      const rival = p?.rival || (p ? (cond === 'casa' ? p.visitante : p.local) : '');
      setSf({
        equipo: clubTeam,
        condicion: cond,
        rival,
        fecha: p?.fecha || '',
        categoria: p?.categoria || categorias[0]?.nombre || '',
        campo: p?.campo || '',
        tipo: p?.tipo || 'Liga',
        jornada: p?.jornada !== undefined && p?.jornada !== null ? String(p.jornada) : '',
        golesLocal: p?.golesLocal !== undefined && p?.golesLocal !== null ? String(p.golesLocal) : '',
        golesVisitante: p?.golesVisitante !== undefined && p?.golesVisitante !== null ? String(p.golesVisitante) : '',
        finalizado: p?.finalizado ? '1' : '0',
        horaConvocatoria: p?.horaConvocatoria || ''
      });
    } else if (kind === 'asistencia') {
      const a = item as Asistencia | undefined;
      setSf({
        jugadorId: a?.jugadorId || jugadores[0]?.id || '',
        fecha: a?.fecha || '',
        estado: a?.estado || 'asiste'
      });
    } else if (kind === 'estadistica') {
      const st = item as Estadistica | undefined;
      setSf({
        jugadorId: st?.jugadorId || jugadores[0]?.id || '',
        goles: String(st?.goles ?? 0),
        asistencias: String(st?.asistencias ?? 0),
        tarjetas: String(st?.tarjetas ?? 0),
        partidosJugados: String(st?.partidosJugados ?? 0)
      });
    }
  };

  const handleSaveSheetForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetModalKind) return;
    if (sheetModalKind === 'equipo') {
      if (!sf.nombre.trim()) return;
      await saveEquipo({
        id: (editingSheetItem as Equipo | null)?.id,
        nombre: sf.nombre.trim(),
        categoria: sf.categoria || categorias[0]?.nombre || 'Senior',
        letra: sf.letra.trim().toUpperCase() || 'A',
        division: sf.division.trim() || undefined,
        grupo: sf.grupo.trim() || undefined,
        linkClasificacion: sf.linkClasificacion.trim() || undefined,
        entrenador: sf.entrenador.trim() || undefined,
        escudo: sf.escudo.trim() || undefined
      });
    } else if (sheetModalKind === 'jugador') {
      if (!sf.nombre.trim()) return;
      await saveJugador({
        id: (editingSheetItem as Jugador | null)?.id,
        nombre: sf.nombre.trim(),
        dorsal: sf.dorsal.trim() !== '' ? (Number(sf.dorsal) || sf.dorsal.trim()) : '',
        posicion: (sf.posicion || 'Delantero') as PosicionJugador,
        categoria: sf.categoria || categorias[0]?.nombre || 'Senior',
        equipo: sf.equipo.trim(),
        fechaAlta: sf.fechaAlta || (editingSheetItem as Jugador | null)?.fechaAlta || new Date().toISOString().split('T')[0]
      });
    } else if (sheetModalKind === 'entrenador') {
      if (!sf.nombre.trim()) return;
      await saveEntrenador({
        id: (editingSheetItem as Entrenador | null)?.id,
        nombre: sf.nombre.trim(),
        telefono: sf.telefono.trim()
      });
    } else if (sheetModalKind === 'partido') {
      if (!sf.equipo.trim() || !sf.rival.trim() || !sf.fecha) return;
      const isCasa = sf.condicion === 'casa';
      const local = isCasa ? sf.equipo.trim() : sf.rival.trim();
      const visitante = isCasa ? sf.rival.trim() : sf.equipo.trim();
      await savePartido({
        id: (editingSheetItem as Partido | null)?.id,
        local,
        visitante,
        equipo: sf.equipo.trim(),
        condicion: (sf.condicion === 'fuera' ? 'fuera' : 'casa'),
        rival: sf.rival.trim(),
        fecha: sf.fecha,
        categoria: sf.categoria || categorias[0]?.nombre || 'Senior',
        campo: sf.campo.trim() || undefined,
        tipo: (sf.tipo || 'Liga') as Partido['tipo'],
        jornada: sf.tipo === 'Liga' && sf.jornada.trim() !== '' ? sf.jornada.trim() : undefined,
        golesLocal: sf.golesLocal.trim() !== '' ? sf.golesLocal.trim() : undefined,
        golesVisitante: sf.golesVisitante.trim() !== '' ? sf.golesVisitante.trim() : undefined,
        finalizado: sf.finalizado === '1',
        horaConvocatoria: sf.horaConvocatoria.trim() || undefined
      });
    } else if (sheetModalKind === 'asistencia') {
      if (!sf.jugadorId || !sf.fecha) return;
      await saveAsistencia({
        id: (editingSheetItem as Asistencia | null)?.id,
        jugadorId: sf.jugadorId,
        fecha: sf.fecha,
        estado: (sf.estado === 'no asiste' ? 'no asiste' : 'asiste') as EstadoAsistencia
      });
    } else if (sheetModalKind === 'estadistica') {
      if (!sf.jugadorId) return;
      await saveEstadistica({
        jugadorId: sf.jugadorId,
        goles: Number(sf.goles) || 0,
        asistencias: Number(sf.asistencias) || 0,
        tarjetas: Number(sf.tarjetas) || 0,
        partidosJugados: Number(sf.partidosJugados) || 0
      });
    }
    setSheetModalKind(null);
    setEditingSheetItem(null);
  };


  const openAddCat = () => {
    setEditingCat(null);
    setCatFormNombre('');
    setCatFormTipo('F11');
    setCatFormTiempo(45);
    setIsCatModalOpen(true);
  };

  const openEditCat = (cat: Categoria) => {
    setEditingCat(cat);
    setCatFormNombre(cat.nombre);
    const defTipo: TipoFutbol = cat.tipo || (
      cat.nombre.toLowerCase().includes('f8') ||
      cat.nombre.toLowerCase().includes('alev') ||
      cat.nombre.toLowerCase().includes('benj') ||
      cat.nombre.toLowerCase().includes('preb')
        ? 'F8'
        : 'F11'
    );
    setCatFormTipo(defTipo);
    setCatFormTiempo(Number(cat.tiempojuego || cat.tiempoJuego) || (defTipo === 'F8' ? 25 : 45));
    setIsCatModalOpen(true);
  };

  const handleSaveCatForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormNombre.trim()) return;
    await saveCategoria({
      id: editingCat?.id,
      nombre: catFormNombre.trim(),
      tipo: catFormTipo,
      tiempojuego: Number(catFormTiempo) || (catFormTipo === 'F8' ? 25 : 45)
    });
    setIsCatModalOpen(false);
  };

  // Sincronización
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(googleScriptUrl);

  const sheetsInfo = [
    { name: 'jugadores', label: 'Jugadores', count: jugadores.length, icon: '⚽' },
    { name: 'equipos', label: 'Equipos', count: equipos.length, icon: '🛡️' },
    { name: 'categorias', label: 'Categorías', count: categorias.length, icon: '🏷️' },
    { name: 'entrenadores', label: 'Entrenadores', count: entrenadores.length, icon: '📋' },
    { name: 'partidos', label: 'Partidos', count: partidos.length, icon: '📅' },
    { name: 'asistencias', label: 'Asistencias', count: asistencias.length, icon: '✅' },
    { name: 'estadisticas', label: 'Estadísticas', count: estadisticas.length, icon: '📊' },
    { name: 'usuarios', label: 'Usuarios y Permisos', count: users.length, icon: '👤' }
  ];

  const openAddUser = () => {
    setEditingUser(null);
    setFormNombre('');
    setFormEmail('');
    setFormRol('entrenador');
    setFormEquipo(equipos[0]?.nombre || '');
    setFormPassword('');
    setIsUserModalOpen(true);
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setFormNombre(u.nombre);
    setFormEmail(u.email);
    setFormRol(u.rol);
    setFormEquipo(u.equipo || equipos[0]?.nombre || '');
    setFormPassword(u.password || '');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateUserForm({
      nombre: formNombre,
      email: formEmail,
      password: formPassword,
      users,
      editingId: editingUser?.id
    });
    if (!validation.valid) {
      addToast({
        type: 'error',
        title: 'Datos incompletos',
        message: validation.message || 'Revisa los datos del formulario.'
      });
      return;
    }

    if (roleRequiresTeam(formRol) && !formEquipo.trim()) {
      addToast({
        type: 'error',
        title: 'Equipo requerido',
        message: 'Debes seleccionar un equipo registrado para este usuario.'
      });
      return;
    }

    await saveUser({
      id: editingUser?.id,
      nombre: formNombre.trim(),
      email: formEmail.trim(),
      rol: formRol,
      equipo: roleRequiresTeam(formRol) ? formEquipo.trim() : undefined,
      password: formPassword || '123456'
    });

    setIsUserModalOpen(false);
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === currentUser?.id) {
      addToast({
        type: 'error',
        title: 'Acción bloqueada',
        message: 'No puedes eliminar tu propia cuenta de usuario en sesión.'
      });
      return;
    }

    if (confirm(`¿Eliminar al usuario ${u.nombre}?`)) {
      await deleteUser(u.id);
    }
  };

  const handleSaveScriptUrl = async () => {
    setIsTestingUrl(true);
    try {
      setGoogleScriptUrl(tempUrl);
      await syncAllData();
      addToast({
        type: 'success',
        title: 'URL Actualizada',
        message: 'Conectado exitosamente con Supabase.'
      });
    } catch (e: any) {
      addToast({
        type: 'error',
        title: 'Error de conexión',
        message: e.message || 'No se pudo conectar a la URL proporcionada.'
      });
    } finally {
      setIsTestingUrl(false);
    }
  };

  const handleSaveClubIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubNombre.trim()) {
      addToast({
        type: 'error',
        title: 'Nombre Requerido',
        message: 'Por favor introduce el nombre oficial de tu club.'
      });
      return;
    }
    saveClubConfig({
      nombre: clubNombre.trim(),
      escudo: clubEscudo.trim() || DEFAULT_CLUB_SHIELD,
      acronimo: clubAcronimo.trim() || clubNombre.trim().substring(0, 3).toUpperCase(),
      lema: clubLema.trim(),
      temporada: clubTemporada.trim()
    });
  };

  const filteredUsers = users.filter(
    u =>
      u.nombre.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.rol.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-athletic tracking-tight">
            PANEL DE <span className="text-orange-600">ADMINISTRACIÓN</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Personalización de la identidad del club, Supabase y gestión de usuarios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAllSheets()}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Exportar Todas las Hojas (CSV)
          </button>
          <button
            onClick={() => {
              if (confirm('¿Deseas restaurar los datos iniciales de prueba? Esto reiniciará el almacenamiento local.')) {
                resetDataToMock();
              }
            }}
            className={`px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors items-center gap-1.5 ${canSync ? 'flex' : 'hidden'}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restablecer Datos
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-200 space-x-2 overflow-x-auto no-scrollbar whitespace-nowrap -mx-3 px-3 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('identity')}
          className={`px-3 sm:px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'identity'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4 text-orange-500" />
          Identidad del Club
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-3 sm:px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'database'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Database className="w-4 h-4" />
          Tablas Supabase (9)
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 sm:px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'users'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuarios & Roles ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('appsScript')}
          className={`px-3 sm:px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'appsScript'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Code className="w-4 h-4" />
            Conexión Supabase
        </button>
      </div>

      {/* 0. TAB IDENTIDAD Y PERSONALIZACIÓN DEL CLUB */}
      {activeTab === 'identity' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-lg shadow-orange-500/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs">
                Personalización de la Aplicación
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-athletic tracking-tight">
                IDENTIDAD Y ESCUDO DE TU CLUB
              </h2>
              <p className="text-xs sm:text-sm text-orange-100 leading-relaxed">
                Personaliza la aplicación con el nombre oficial y el escudo de tu club. Se aplicará instantáneamente a la cabecera, navegación móvil, partidos y pie de página.
              </p>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-md p-2 border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <TeamShield
                escudoUrl={clubEscudo}
                teamName={clubNombre || 'Club'}
                size="xl"
                className="w-full h-full filter drop-shadow-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulario de Configuración */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900 font-athletic flex items-center gap-2">
                  <Palette className="w-4 h-4 text-orange-600" />
                  Datos Oficiales del Club
                </h3>
                <p className="text-xs text-gray-500">
                  Modifica los parámetros visuales para que la plataforma pertenezca totalmente a tu club.
                </p>
              </div>

              <form onSubmit={handleSaveClubIdentity} className="space-y-4">
                {/* Nombre del Club */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nombre Oficial del Club *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Club Deportivo Los Leones"
                    value={clubNombre}
                    onChange={e => setClubNombre(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Este nombre aparecerá en la barra superior, títulos y documentos oficiales.
                  </p>
                </div>

                {/* Escudo mediante enlace */}
                <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Link2 className="w-4 h-4 text-orange-600" />
                      Escudo del Club (Enlace / URL directo)
                    </label>
                    {clubEscudo && (
                      <button
                        type="button"
                        onClick={() => setClubEscudo('')}
                        className="text-[10px] text-gray-500 hover:text-red-600 font-medium"
                      >
                        Limpiar URL
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3 items-center">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                      <TeamShield
                        escudoUrl={clubEscudo}
                        teamName={clubNombre || 'Club'}
                        size="lg"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/logo-club.png (o SVG / JPG)"
                        value={clubEscudo}
                        onChange={e => setClubEscudo(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-gray-500">
                        Copia y pega la dirección de imagen de tu escudo oficial o selecciona uno predefinido.
                      </p>
                    </div>
                  </div>

                  {/* Presets rápidos */}
                  <div className="pt-2 border-t border-orange-200/60">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-orange-500" />
                      O elige uno de nuestros diseños predefinidos:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {SHIELD_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setClubEscudo(preset.url)}
                          className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                            clubEscudo === preset.url
                              ? 'bg-orange-500 text-white border-orange-600 shadow-sm ring-2 ring-orange-300'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-6 h-6 object-contain shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-[11px] font-bold truncate leading-tight">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Acrónimo, Lema y Temporada */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Acrónimo / Siglas
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: CDL"
                      maxLength={6}
                      value={clubAcronimo}
                      onChange={e => setClubAcronimo(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Temporada Activa
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 2025/2026"
                      value={clubTemporada}
                      onChange={e => setClubTemporada(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Lema o Eslogan
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Pasión y victoria"
                      value={clubLema}
                      onChange={e => setClubLema(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-150 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Los cambios se guardan localmente y se propagan a todo el sistema.
                  </span>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md shadow-orange-500/20 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Guardar Identidad del Club
                  </button>
                </div>
              </form>
            </div>

            {/* Tarjeta de Previsualización en Vivo */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm space-y-4">
                <div className="border-b border-gray-100 pb-2">
                  <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                    Previsualización en tiempo real
                  </span>
                  <h4 className="font-bold text-gray-900 text-sm">Cabecera Oficial Personalizada</h4>
                </div>

                {/* Mock Barra Navbar */}
                <div className="bg-gray-950 rounded-2xl p-4 text-white shadow-md border border-gray-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 overflow-hidden ring-2 ring-orange-500/30 shrink-0">
                      <TeamShield
                        escudoUrl={clubEscudo}
                        teamName={clubNombre || 'Club'}
                        size="lg"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="truncate">
                      <p className="font-extrabold text-sm sm:text-base tracking-tight font-athletic uppercase truncate">
                        {clubNombre || 'NOMBRE DEL CLUB'}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 truncate">
                        <span>{clubLema || 'Gestión Deportiva'}</span>
                        <span>•</span>
                        <span className="text-orange-400 font-semibold">{clubTemporada || '2025/2026'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      App Personalizada
                    </span>
                    <span className="text-orange-400 font-bold uppercase tracking-wider">
                      {clubAcronimo || 'SIGLAS'}
                    </span>
                  </div>
                </div>

                {/* Beneficios de la personalización */}
                <div className="space-y-2 pt-2 text-xs text-gray-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>El escudo y el nombre sustituyen automáticamente los textos genéricos.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Los partidos y convocatorias asocian los escudos a los equipos correspondientes.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Compatible tanto con enlaces web HTTPS (PNG, SVG, JPG) como con presets.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Tab Hojas de Cálculo - Acceso y Modificación Total */}
      {activeTab === 'database' && (
        <div className="space-y-5">
          {/* Banner Informativo */}
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-xs text-orange-950">
                <h4 className="font-bold font-athletic text-sm text-orange-900">
                  GESTIÓN Y MODIFICACIÓN TOTAL DE HOJAS GOOGLE SHEETS
                </h4>
                <p className="mt-0.5 text-orange-800">
                  Accede, visualiza y modifica cualquier hoja de cálculo en tiempo real. Todos los identificadores técnicos (IDs)
                  han sido eliminados de la vista para ofrecer una experiencia limpia y centrada en los datos deportivos.
                </p>
              </div>
            </div>
            <button
              onClick={() => syncAllData()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sincronizar Todo
            </button>
          </div>

          {/* Selector Horizontal de Hojas */}
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Selecciona una hoja para gestionar:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {sheetsInfo.map(sheet => {
                const isSelected = selectedSheet === sheet.name;
                return (
                  <button
                    key={sheet.name}
                    type="button"
                    onClick={() => {
                      setSelectedSheet(sheet.name);
                      setSheetSearch('');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-orange-500 border-orange-600 text-white shadow-sm ring-2 ring-orange-400/50'
                        : 'bg-white border-gray-200 text-gray-800 hover:border-orange-300 hover:bg-orange-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{sheet.icon}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-athletic ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {sheet.count}
                      </span>
                    </div>
                    <span className="font-bold text-xs mt-1.5 truncate capitalize">
                      {sheet.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visor y Editor de la Hoja Seleccionada */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden space-y-4 p-5">
            {/* Cabecera de la hoja activa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 font-athletic uppercase tracking-wide flex items-center gap-2">
                    <span>Hoja:</span>
                    <span className="text-orange-600 underline decoration-orange-300">{selectedSheet}</span>
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                    {selectedSheet === 'categorias' && `${categorias.length} registros`}
                    {selectedSheet === 'equipos' && `${equipos.length} registros`}
                    {selectedSheet === 'jugadores' && `${jugadores.length} registros`}
                    {selectedSheet === 'entrenadores' && `${entrenadores.length} registros`}
                    {selectedSheet === 'partidos' && `${partidos.length} registros`}
                    {selectedSheet === 'asistencias' && `${asistencias.length} registros`}
                    {selectedSheet === 'estadisticas' && `${estadisticas.length} registros`}
                    {selectedSheet === 'usuarios' && `${users.length} registros`}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {selectedSheet === 'categorias' && 'Campos: nombre | tipo (F8 o F11) | tiempojuego (minutos por parte)'}
                  {selectedSheet === 'equipos' && 'Campos: escudo | nombre | categoria | entrenador | division | grupo | linkClasificacion'}
                  {selectedSheet === 'jugadores' && 'Campos: dorsal | nombre | posicion | equipo | categoria | fechaAlta'}
                  {selectedSheet === 'entrenadores' && 'Campos: nombre | telefono'}
                  {selectedSheet === 'partidos' && 'Campos: local | visitante | fecha | categoria | equipo | hora | campo | tipo | jornada | golesLocal | golesVisitante | eventos | finalizado | convocados | titulares | formacion'}
                  {selectedSheet === 'usuarios' && 'Campos: nombre | email | rol | equipo'}
                  {selectedSheet === 'asistencias' && 'Campos: jugadorId | fecha | estado'}
                  {selectedSheet === 'estadisticas' && 'Campos: jugadorId | goles | asistencias | tarjetas | partidosJugados'}
                </p>
              </div>

              {/* Botones de acción para la hoja */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedSheet === 'categorias' && (
                  <button
                    onClick={openAddCat}
                    className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nueva Categoría
                  </button>
                )}
                {selectedSheet === 'usuarios' && canUsuarios && (
                  <button
                    onClick={openAddUser}
                    className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Usuario
                  </button>
                )}
                {selectedSheet === 'equipos' && (
                  <button
                    onClick={() => openSheetModal('equipo')}
                    className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Equipo
                  </button>
                )}
                {selectedSheet === 'jugadores' && (
                  <button
                    onClick={() => openSheetModal('jugador')}
                    className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Jugador
                  </button>
                )}
                {selectedSheet === 'entrenadores' && (
                  <button
                    onClick={() => openSheetModal('entrenador')}
                    className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Entrenador
                  </button>
                )}
                {selectedSheet === 'partidos' && (
                  <button
                    onClick={() => openSheetModal('partido')}
                    className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Partido
                  </button>
                )}
                {selectedSheet === 'asistencias' && (
                  <button
                    onClick={() => openSheetModal('asistencia')}
                    className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nueva Asistencia
                  </button>
                )}
                <button
                  onClick={() => exportSheet(selectedSheet)}
                  className="px-3 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                  Descargar CSV
                </button>
              </div>
            </div>

            {/* Buscador de registros en la hoja */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={sheetSearch}
                onChange={e => setSheetSearch(e.target.value)}
                placeholder={`Buscar en hoja ${selectedSheet}...`}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            {/* TABLA: CATEGORÍAS (con tipo F8/F11 y tiempojuego por parte, SIN ID) */}
            {selectedSheet === 'categorias' && (
              <div className="overflow-x-auto scroll-x rounded-xl border border-gray-150">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 text-white font-athletic uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Modalidad</th>
                      <th className="py-3 px-4">Tiempo de Juego (Reglamentario)</th>
                      <th className="py-3 px-4">Equipos Vinculados</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categorias
                      .filter(c => c.nombre.toLowerCase().includes(sheetSearch.toLowerCase()))
                      .map(cat => {
                        const countEquipos = equipos.filter(e => e.categoria === cat.nombre).length;
                        const mins = Number(cat.tiempojuego || cat.tiempoJuego) || (cat.tipo === 'F8' ? 25 : 45);
                        const esF8 = cat.tipo === 'F8';

                        return (
                          <tr key={cat.id} className="hover:bg-orange-50/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-gray-900 text-sm">{cat.nombre}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                                  esF8
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                ⚽ {cat.tipo || 'F11'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-bold text-[11px]">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  {mins}&apos;
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-orange-50 text-orange-700 font-bold rounded text-[11px] border border-orange-100">
                                {countEquipos} {countEquipos === 1 ? 'equipo' : 'equipos'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditCat(cat)}
                                  title="Editar categoría en la hoja"
                                  className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`¿Eliminar la categoría ${cat.nombre} de Supabase?`)) {
                                      deleteCategoria(cat.id);
                                    }
                                  }}
                                  title="Eliminar de la hoja"
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TABLA: EQUIPOS (SIN ID) */}
            {selectedSheet === 'equipos' && (
              <div className="overflow-x-auto scroll-x rounded-xl border border-gray-150">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 text-white font-athletic uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Escudo</th>
                      <th className="py-3 px-4">Nombre del Equipo</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">División / Grupo</th>
                      <th className="py-3 px-4">Entrenador</th>
                      <th className="py-3 px-4">Plantilla</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {equipos
                      .filter(e => e.nombre.toLowerCase().includes(sheetSearch.toLowerCase()) || e.categoria.toLowerCase().includes(sheetSearch.toLowerCase()))
                      .sort((a, b) => compareTeams(a.nombre, b.nombre, equipos))
                      .map(eq => {
                        const numJug = jugadores.filter(j => j.equipo === eq.nombre).length;
                        return (
                          <tr key={eq.id} className="hover:bg-orange-50/30 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 p-0.5 flex items-center justify-center overflow-hidden">
                                <TeamShield escudoUrl={eq.escudo} teamName={eq.nombre} size="xs" className="w-full h-full" />
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-bold text-gray-900 text-sm">{eq.nombre}</td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 bg-orange-50 text-orange-700 font-semibold rounded text-[11px] border border-orange-100">
                                {eq.categoria}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-gray-600">
                              {eq.division || eq.grupo ? (
                                <div className="flex flex-wrap gap-1">
                                  {eq.division && (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] border border-blue-100 font-medium">
                                      {eq.division}
                                    </span>
                                  )}
                                  {eq.grupo && (
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] border border-purple-100 font-medium">
                                      {eq.grupo}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-gray-700">{eq.entrenador}</td>
                            <td className="py-2.5 px-4 font-athletic font-bold text-gray-800">{numJug} Jugadores</td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openSheetModal('equipo', eq)}
                                  className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                                  title="Editar equipo"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`¿Eliminar equipo ${eq.nombre}?`)) deleteEquipo(eq.id);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TABLA: JUGADORES (SIN ID, AGRUPADOS POR EQUIPO, ORDEN DEL CLUB, PLEGABLE) */}
            {selectedSheet === 'jugadores' && (() => {
              const search = sheetSearch.toLowerCase();
              const filtered = jugadores.filter(j =>
                j.nombre.toLowerCase().includes(search) || j.equipo.toLowerCase().includes(search)
              );
              const byTeam = new Map<string, typeof jugadores>();
              filtered.forEach(j => {
                const key = j.equipo || 'Sin equipo';
                if (!byTeam.has(key)) byTeam.set(key, []);
                byTeam.get(key)!.push(j);
              });
              const teamNames = Array.from(byTeam.keys()).sort((a, b) => compareTeams(a, b, equipos));
              const toggleTeam = (name: string) => {
                setJugadoresEquiposAbiertos(prev => {
                  const next = new Set(prev);
                  if (next.has(name)) next.delete(name);
                  else next.add(name);
                  return next;
                });
              };
              return (
                <div className="space-y-4">
                  {teamNames.length === 0 && (
                    <div className="bg-white rounded-xl border border-gray-150 p-6 text-center text-sm text-gray-400">
                      No hay jugadores que coincidan con la búsqueda.
                    </div>
                  )}
                  {teamNames.map(teamName => {
                    const team = equipos.find(e => e.nombre === teamName);
                    const lista = byTeam.get(teamName)!;
                    const abierto = jugadoresEquiposAbiertos.has(teamName);
                    return (
                      <div key={teamName} className="rounded-xl border border-gray-150 bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleTeam(teamName)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900 text-white hover:bg-gray-800 transition-colors text-left"
                          aria-expanded={abierto}
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                            <TeamShield escudoUrl={team?.escudo} teamName={teamName} size="xs" className="w-full h-full" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold font-athletic truncate">{teamName}</h3>
                              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-400/40 rounded text-[10px] font-bold">
                                {lista.length} jugador{lista.length !== 1 ? 'es' : ''}
                              </span>
                              {team?.division && (
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/40 rounded text-[10px] font-semibold">
                                  {team.division}
                                </span>
                              )}
                              {team?.grupo && (
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-400/40 rounded text-[10px] font-semibold">
                                  {team.grupo}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">{team?.categoria || ''}</p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                        </button>
                        {abierto && (
                          <div className="overflow-x-auto scroll-x">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-gray-50 text-gray-600 font-athletic uppercase tracking-wider text-[11px]">
                                <tr>
                                  <th className="py-2.5 px-4 text-center w-14">Dorsal</th>
                                  <th className="py-2.5 px-4">Nombre</th>
                                  <th className="py-2.5 px-4">Posición</th>
                                  <th className="py-2.5 px-4">Categoría</th>
                                  <th className="py-2.5 px-4">Fecha de Alta</th>
                                  <th className="py-2.5 px-4 text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {lista.map(jugador => (
                                  <tr key={jugador.id} className="hover:bg-orange-50/30 transition-colors">
                                    <td className="py-2.5 px-4 text-center font-athletic font-bold text-gray-900">
                                      #{jugador.dorsal || '-'}
                                    </td>
                                    <td className="py-2.5 px-4 font-bold text-gray-900 text-sm">{jugador.nombre}</td>
                                    <td className="py-2.5 px-4">
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px] font-medium">
                                        {jugador.posicion}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-gray-600">{jugador.categoria}</td>
                                    <td className="py-2.5 px-4 text-gray-400 font-mono text-[11px]">{jugador.fechaAlta}</td>
                                    <td className="py-2.5 px-4 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => openSheetModal('jugador', jugador)}
                                          className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                                          title="Editar jugador"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm(`¿Eliminar jugador ${jugador.nombre}?`)) deleteJugador(jugador.id);
                                          }}
                                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* TABLA: ENTRENADORES (SIN ID) */}
            {selectedSheet === 'entrenadores' && (
              <div className="overflow-x-auto scroll-x rounded-xl border border-gray-150">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 text-white font-athletic uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Nombre del Entrenador</th>
                      <th className="py-3 px-4">Equipos Asignados</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entrenadores
                      .filter(ent => ent.nombre.toLowerCase().includes(sheetSearch.toLowerCase()))
                      .map(ent => {
                        const equiposAsignados = equipos.filter(e => e.entrenador === ent.nombre);
                        return (
                          <tr key={ent.id} className="hover:bg-orange-50/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-gray-900 text-sm">{ent.nombre}</td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {equiposAsignados.map(e => (
                                  <span key={e.id} className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded font-semibold text-[10px]">
                                    {e.nombre}
                                  </span>
                                ))}
                                {equiposAsignados.length === 0 && (
                                  <span className="text-gray-400 italic">Sin asignar</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openSheetModal('entrenador', ent)}
                                  className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                                  title="Editar entrenador"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`¿Eliminar entrenador ${ent.nombre}?`)) deleteEntrenador(ent.id);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TABLA: PARTIDOS (SIN ID) */}
            {selectedSheet === 'partidos' && (
              <div className="overflow-x-auto scroll-x rounded-xl border border-gray-150">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 text-white font-athletic uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Fecha y Hora</th>
                      <th className="py-3 px-4">Equipo Local</th>
                      <th className="py-3 px-4">Equipo Visitante</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Tipo / Jornada</th>
                      <th className="py-3 px-4">Resultado / Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {partidos
                      .filter(p => p.local.toLowerCase().includes(sheetSearch.toLowerCase()) || p.visitante.toLowerCase().includes(sheetSearch.toLowerCase()))
                      .map(partido => (
                        <tr key={partido.id} className="hover:bg-orange-50/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-gray-600">
                            {new Date(partido.fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-900">{partido.local}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">{partido.visitante}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-orange-50 text-orange-700 font-semibold rounded text-[11px] border border-orange-100">
                              {partido.categoria}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-medium rounded text-[11px]">
                              {partido.tipo || 'Liga'}
                              {(!partido.tipo || partido.tipo === 'Liga') && partido.jornada && ` - J.${partido.jornada}`}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {partido.finalizado ? (
                              <span className="font-bold font-athletic text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {partido.golesLocal} - {partido.golesVisitante} (Final)
                              </span>
                            ) : (
                              <span className="text-gray-500 font-medium">Por disputar</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openSheetModal('partido', partido)}
                                className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                                title="Editar partido"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar partido ${partido.local} vs ${partido.visitante}?`)) {
                                    deletePartido(partido.id);
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TABLA: USUARIOS (SIN ID) */}
            {selectedSheet === 'usuarios' && (
              <div className="overflow-x-auto scroll-x rounded-xl border border-gray-150">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 text-white font-athletic uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Nombre</th>
                      <th className="py-3 px-4">Correo Electrónico</th>
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4">Equipo</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users
                      .filter(u => u.nombre.toLowerCase().includes(sheetSearch.toLowerCase()) || u.email.toLowerCase().includes(sheetSearch.toLowerCase()))
                      .map(u => (
                        <tr key={u.id} className="hover:bg-orange-50/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-gray-900 text-sm">{u.nombre}</td>
                          <td className="py-3 px-4 text-gray-600">{u.email}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800">
                              {u.rol}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{u.equipo || 'Sin equipo'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className={`items-center justify-end gap-1 ${canUsuarios ? 'flex' : 'hidden'}`}>
                              <button
                                onClick={() => openEditUser(u)}
                                className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}



            {/* TABLA: ASISTENCIAS (SIN ID) */}
            {selectedSheet === 'asistencias' && (
              <div className="overflow-x-auto scroll-x rounded-xl border border-gray-150">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 text-white font-athletic uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Futbolista</th>
                      <th className="py-3 px-4">Equipo</th>
                      <th className="py-3 px-4">Asistencia</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {asistencias.slice(0, 50).map(asist => {
                      const j = jugadores.find(jug => jug.id === asist.jugadorId);
                      return (
                        <tr key={asist.id} className="hover:bg-orange-50/30 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-gray-600">{asist.fecha}</td>
                          <td className="py-2.5 px-4 font-bold text-gray-900">{j?.nombre || 'Jugador registrado'}</td>
                          <td className="py-2.5 px-4 text-gray-600">{j?.equipo || '-'}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] uppercase ${
                                asist.estado === 'asiste'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {asist.estado}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openSheetModal('asistencia', asist)}
                                className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                                title="Editar asistencia"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('¿Eliminar este registro de asistencia?')) deleteAsistencia(asist.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TABLA: ESTADÍSTICAS (SIN ID) */}
            {selectedSheet === 'estadisticas' && (
              <div className="overflow-x-auto scroll-x rounded-xl border border-gray-150">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 text-white font-athletic uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Futbolista</th>
                      <th className="py-3 px-4">Equipo</th>
                      <th className="py-3 px-4 text-center">Goles</th>
                      <th className="py-3 px-4 text-center">Asistencias</th>
                      <th className="py-3 px-4 text-center">Tarjetas</th>
                      <th className="py-3 px-4 text-center">Partidos</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {estadisticas.map(stat => {
                      const j = jugadores.find(jug => jug.id === stat.jugadorId);
                      return (
                        <tr key={stat.id} className="hover:bg-orange-50/30 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-gray-900">{j?.nombre || 'Jugador'}</td>
                          <td className="py-2.5 px-4 text-gray-600">{j?.equipo || '-'}</td>
                          <td className="py-2.5 px-4 text-center font-athletic font-bold text-orange-600 text-sm">
                            {stat.goles}
                          </td>
                          <td className="py-2.5 px-4 text-center font-athletic font-bold text-gray-800">
                            {stat.asistencias}
                          </td>
                          <td className="py-2.5 px-4 text-center font-athletic font-bold text-amber-600">
                            {stat.tarjetas}
                          </td>
                          <td className="py-2.5 px-4 text-center font-athletic font-bold text-gray-600">
                            {stat.partidosJugados}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => openSheetModal('estadistica', stat)}
                              className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                              title="Editar estadísticas"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Tab Usuarios y Roles */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Gestiona el personal del club con acceso a la plataforma. El administrador asigna el rol y el equipo de cada usuario.
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none w-full sm:w-56"
                />
              </div>
              <button
                onClick={openAddUser}
                className={`px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm items-center gap-1.5 shrink-0 ${canUsuarios ? 'flex' : 'hidden'}`}
              >
                <UserPlus className="w-4 h-4" />
                Nuevo Usuario
              </button>
            </div>
          </div>

          {/* Resumen de usuarios por rol */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {ROLE_ORDER.map(rol => {
              const info = getRoleInfo(rol);
              const count = users.filter(u => u.rol === rol).length;
              return (
                <div
                  key={rol}
                  className={`p-3 rounded-2xl border bg-white transition-opacity ${
                    count > 0 ? 'border-gray-200' : 'border-gray-100 opacity-55'
                  }`}
                  title={info.description}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${info.dotClass}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">
                      {info.shortLabel}
                    </span>
                  </div>
                  <p className="text-xl font-black font-athletic text-gray-900 mt-1">{count}</p>
                </div>
              );
            })}
          </div>

          <div className="hidden sm:block bg-white rounded-2xl border border-gray-150 shadow-sm overflow-x-auto scroll-x">
              <table className="w-full text-left text-xs min-w-[680px]">
                <thead className="bg-gray-900 text-white font-athletic uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Correo Electrónico</th>
                    <th className="py-3 px-4">Rol en el Club</th>
                    <th className="py-3 px-4">Equipo Asignado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(u => {
                    const info = getRoleInfo(u.rol);
                    return (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm shrink-0 ${info.avatarBg}`}
                            >
                              {u.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                {u.nombre}
                                {u.id === currentUser?.id && (
                                  <span className="text-[10px] text-orange-600 font-bold">(tú)</span>
                                )}
                              </p>
                              <p className="text-[11px] text-gray-400">{SCOPE_LABELS[info.scope]}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${info.badgeClass}`}
                          >
                            {info.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.equipo ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-gray-800 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg text-xs">
                              <span className="text-orange-500">⚽</span>
                              <span>{u.equipo}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">Sin equipo</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className={`items-center justify-end gap-1 ${canUsuarios ? 'flex' : 'hidden'}`}>
                            <button
                              onClick={() => openEditUser(u)}
                              title="Editar usuario y rol"
                              className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Eliminar usuario"
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                        No se encontraron usuarios que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
          </div>

          {/* Usuarios en móvil (tarjetas) */}
          <div className="sm:hidden bg-white rounded-2xl border border-gray-150 shadow-sm divide-y divide-gray-100 overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                No se encontraron usuarios que coincidan con la búsqueda.
              </div>
            ) : (
              filteredUsers.map(u => {
                const info = getRoleInfo(u.rol);
                return (
                  <div key={u.id} className="p-3.5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ${info.avatarBg}`}
                      >
                        {u.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{u.nombre}</span>
                              {u.id === currentUser?.id && (
                                <span className="shrink-0 text-[10px] text-orange-600 font-bold">(tú)</span>
                              )}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                          </div>
                          {canUsuarios && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEditUser(u)}
                                title="Editar usuario y rol"
                                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                title="Eliminar usuario"
                                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${info.badgeClass}`}
                          >
                            {info.label}
                          </span>
                          <span className="text-[10px] text-gray-400">{SCOPE_LABELS[info.scope]}</span>
                          {u.equipo ? (
                            <span className="inline-flex items-center gap-1 font-bold text-gray-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg text-[10px]">
                              <span className="text-orange-500">⚽</span>
                              <span className="truncate max-w-[140px]">{u.equipo}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px] italic">Sin equipo</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <RolePermissionsMatrix currentRole={currentUser?.rol} canManageUsers={canUsuarios} />
        </div>
      )}

      {/* 3. Tab Conexión & Setup */}
      {activeTab === 'appsScript' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 font-athletic">
              CONFIGURACIÓN DE LA API GOOGLE APPS SCRIPT
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Conecta tu propia hoja de cálculo en Google Drive para almacenamiento ilimitado en la nube.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              URL de Supabase (Project URL):
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={tempUrl}
                onChange={e => setTempUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
              <button
                onClick={handleSaveScriptUrl}
                disabled={isTestingUrl}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isTestingUrl ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {isTestingUrl ? 'Probando...' : 'Guardar y Sincronizar'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              * Si no se especifica ninguna URL, la app opera de manera 100% autónoma y funcional en modo local.
            </p>
          </div>

          {/* Guía rápida de 3 pasos */}
          <div className="pt-4 border-t border-gray-150">
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-900 mb-3">
              Guía de Implementación en 3 Pasos (Sin Coste):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                <span className="font-bold text-orange-600 text-sm font-athletic">PASO 1</span>
                <p className="font-bold text-gray-800">Crear proyecto Supabase</p>
                <p className="text-gray-500">
                  Crea un proyecto en supabase.com y ejecuta <em>supabase-schema.sql</em> en el SQL Editor.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                <span className="font-bold text-orange-600 text-sm font-athletic">PASO 2</span>
                <p className="font-bold text-gray-800">Configurar .env</p>
                <p className="text-gray-500">
                  Define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en el archivo <code>.env</code>.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                <span className="font-bold text-orange-600 text-sm font-athletic">PASO 3</span>
                <p className="font-bold text-gray-800">Probar conexión</p>
                <p className="text-gray-500">
                  Pulsa "Probar conexión" aquí o en el modal de Supabase y sincroniza los datos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Usuario */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        subtitle="Asigna permisos para acceder a las áreas del club"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={formNombre}
              onChange={e => setFormNombre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Correo Electrónico *
            </label>
            <input
              type="email"
              required
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Rol de Acceso
            </label>
            <select
              value={formRol}
              onChange={e => setFormRol(e.target.value as RolUsuario)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              {ROLE_ORDER.map(rol => (
                <option key={rol} value={rol}>
                  {getRoleInfo(rol).label}
                </option>
              ))}
            </select>
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-2">
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getRoleInfo(formRol).dotClass}`} />
              <p className="text-[11px] text-gray-600 leading-snug">{getRoleInfo(formRol).description}</p>
            </div>
          </div>

          {roleRequiresTeam(formRol) && (
            <div className="p-3.5 bg-orange-50/80 border border-orange-200 rounded-xl space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Equipo Asignado *
                </label>
                <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                  Obligatorio ({getRoleInfo(formRol).label})
                </span>
              </div>
              <select
                value={formEquipo}
                onChange={e => setFormEquipo(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {equipos.length === 0 ? (
                  <option value="">No hay equipos registrados en el sistema</option>
                ) : (
                  equipos.map(eq => (
                    <option key={eq.id} value={eq.nombre}>
                      {eq.nombre} ({eq.categoria})
                    </option>
                  ))
                )}
              </select>
              <p className="text-[11px] text-gray-600">
                {formRol === 'entrenador'
                  ? 'Dirigirá y gestionará las convocatorias, partidos y asistencias de este equipo.'
                  : 'Estará formalmente inscrito como jugador en la plantilla de este equipo.'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={formPassword}
              onChange={e => setFormPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-150">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-orange-500/20"
            >
              Guardar Usuario
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Categoría desde Administrador de Hojas */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
        subtitle="Configura el nombre, modalidad (F8 / F11) y duración de los partidos"
      >
        <form onSubmit={handleSaveCatForm} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Nombre de la Categoría
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Alevín A, Cadete Autonómico..."
              value={catFormNombre}
              onChange={e => setCatFormNombre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Campo tipo: F8 o F11 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Modalidad de Fútbol (tipo en Supabase)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCatFormTipo('F8');
                  if (catFormTiempo === 45) setCatFormTiempo(25);
                }}
                className={`p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                  catFormTipo === 'F8'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 shadow-xs'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-athletic font-bold text-lg">⚽ Fútbol 8 (F8)</span>
                  {catFormTipo === 'F8' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Recomendado para Benjamín y Alevín (2 partes de 25 min).
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCatFormTipo('F11');
                  if (catFormTiempo === 25) setCatFormTiempo(45);
                }}
                className={`p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                  catFormTipo === 'F11'
                    ? 'border-blue-500 bg-blue-50/60 text-blue-950 shadow-xs'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-athletic font-bold text-lg">⚽ Fútbol 11 (F11)</span>
                  {catFormTipo === 'F11' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Recomendado para Infantil, Cadete, Juvenil y Senior (2 partes de 45 min).
                </p>
              </button>
            </div>
          </div>

          {/* Campo tiempojuego: minutos por parte (2 partes) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span>Tiempo de Juego por Parte (tiempojuego)</span>
              </label>
              <span className="text-[11px] font-bold text-orange-600 font-athletic bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                2 partes × {catFormTiempo || 0}&apos; = {(catFormTiempo || 0) * 2} min totales
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  required
                  min={10}
                  max={60}
                  value={catFormTiempo}
                  onChange={e => setCatFormTiempo(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-athletic font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none pr-14"
                  placeholder="Minutos por cada parte"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">min/parte</span>
              </div>
            </div>

            {/* Presets rápidos */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preajustes:</span>
              {[20, 25, 30, 35, 40, 45].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCatFormTiempo(preset)}
                  className={`px-2 py-0.5 text-xs rounded-lg font-athletic font-bold border transition-colors ${
                    catFormTiempo === preset
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {preset}&apos;
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              Se guarda en la columna <code className="text-orange-600 bg-orange-50 px-1 py-0.5 rounded font-mono">tiempojuego</code> de Supabase como la duración de cada una de las 2 partes.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-150">
            <button
              type="button"
              onClick={() => setIsCatModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-orange-500/20"
            >
              {editingCat ? 'Guardar Cambios' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal genérico: edición/alta de registros de hojas */}
      <Modal
        isOpen={sheetModalKind !== null}
        onClose={() => {
          setSheetModalKind(null);
          setEditingSheetItem(null);
        }}
        title={
          editingSheetItem
            ? `Editar ${sheetModalKind === 'equipo' ? 'Equipo' : sheetModalKind === 'jugador' ? 'Jugador' : sheetModalKind === 'entrenador' ? 'Entrenador' : sheetModalKind === 'partido' ? 'Partido' : sheetModalKind === 'asistencia' ? 'Asistencia' : 'Estadísticas'}`
            : `Nuevo ${sheetModalKind === 'equipo' ? 'Equipo' : sheetModalKind === 'jugador' ? 'Jugador' : sheetModalKind === 'entrenador' ? 'Entrenador' : sheetModalKind === 'partido' ? 'Partido' : sheetModalKind === 'asistencia' ? 'Asistencia' : 'Registro'}`
        }
        subtitle="Completa los campos y guarda los cambios en la hoja seleccionada"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveSheetForm} className="space-y-4">
          {sheetModalKind === 'equipo' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre del Equipo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Alevín A"
                  value={sf.nombre || ''}
                  onChange={e => setSf({ ...sf, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Categoría</label>
                  <select
                    value={sf.categoria || ''}
                    onChange={e => setSf({ ...sf, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    {categorias.map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Letra</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={sf.letra || ''}
                    onChange={e => setSf({ ...sf, letra: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">División</label>
                  <input
                    type="text"
                    placeholder="Ej: 2ª División"
                    value={sf.division || ''}
                    onChange={e => setSf({ ...sf, division: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Grupo</label>
                  <input
                    type="text"
                    placeholder="Ej: Grupo 3"
                    value={sf.grupo || ''}
                    onChange={e => setSf({ ...sf, grupo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Link de clasificación</label>
                <input
                  type="url"
                  placeholder="https://... (clasificación oficial)"
                  value={sf.linkClasificacion || ''}
                  onChange={e => setSf({ ...sf, linkClasificacion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Entrenador</label>
                  <input
                    type="text"
                    value={sf.entrenador || ''}
                    onChange={e => setSf({ ...sf, entrenador: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Escudo (URL)</label>
                  <input
                    type="url"
                    value={sf.escudo || ''}
                    onChange={e => setSf({ ...sf, escudo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {sheetModalKind === 'jugador' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={sf.nombre || ''}
                  onChange={e => setSf({ ...sf, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Dorsal</label>
                  <input
                    type="text"
                    value={sf.dorsal || ''}
                    onChange={e => setSf({ ...sf, dorsal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Posición</label>
                  <select
                    value={sf.posicion || 'Delantero'}
                    onChange={e => setSf({ ...sf, posicion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="Portero">Portero</option>
                    <option value="Defensa">Defensa</option>
                    <option value="Centrocampista">Centrocampista</option>
                    <option value="Delantero">Delantero</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Equipo</label>
                  <select
                    value={sf.equipo || ''}
                    onChange={e => setSf({ ...sf, equipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="">Sin equipo (libre / cedido)</option>
                    {equipos.map(eq => (
                      <option key={eq.id} value={eq.nombre}>{eq.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Categoría</label>
                  <select
                    value={sf.categoria || ''}
                    onChange={e => setSf({ ...sf, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    {categorias.map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha de Alta</label>
                <input
                  type="date"
                  value={sf.fechaAlta || ''}
                  onChange={e => setSf({ ...sf, fechaAlta: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {sheetModalKind === 'entrenador' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={sf.nombre || ''}
                  onChange={e => setSf({ ...sf, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Teléfono</label>
                <input
                  type="text"
                  value={sf.telefono || ''}
                  onChange={e => setSf({ ...sf, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {sheetModalKind === 'partido' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nuestro Equipo *</label>
                  <select
                    required
                    value={sf.equipo || ''}
                    onChange={e => setSf({ ...sf, equipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    {equipos.map(eq => (
                      <option key={eq.id} value={eq.nombre}>{eq.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Condición *</label>
                  <select
                    value={sf.condicion || 'casa'}
                    onChange={e => setSf({ ...sf, condicion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="casa">En casa (local)</option>
                    <option value="fuera">Fuera (visitante)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Rival *</label>
                <input
                  type="text"
                  required
                  value={sf.rival || ''}
                  onChange={e => setSf({ ...sf, rival: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha y Hora *</label>
                  <input
                    type="datetime-local"
                    required
                    value={sf.fecha || ''}
                    onChange={e => setSf({ ...sf, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Categoría</label>
                  <select
                    value={sf.categoria || ''}
                    onChange={e => setSf({ ...sf, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    {categorias.map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tipo</label>
                  <select
                    value={sf.tipo || 'Liga'}
                    onChange={e => setSf({ ...sf, tipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="Liga">Liga</option>
                    <option value="Amistoso">Amistoso</option>
                    <option value="Torneo">Torneo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Jornada</label>
                  <input
                    type="text"
                    value={sf.jornada || ''}
                    onChange={e => setSf({ ...sf, jornada: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Campo</label>
                  <input
                    type="text"
                    value={sf.campo || ''}
                    onChange={e => setSf({ ...sf, campo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Goles Local</label>
                  <input
                    type="text"
                    value={sf.golesLocal || ''}
                    onChange={e => setSf({ ...sf, golesLocal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Goles Visitante</label>
                  <input
                    type="text"
                    value={sf.golesVisitante || ''}
                    onChange={e => setSf({ ...sf, golesVisitante: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Estado</label>
                  <select
                    value={sf.finalizado || '0'}
                    onChange={e => setSf({ ...sf, finalizado: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="0">Por disputar</option>
                    <option value="1">Finalizado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Hora Convocatoria</label>
                <input
                  type="datetime-local"
                  value={sf.horaConvocatoria || ''}
                  onChange={e => setSf({ ...sf, horaConvocatoria: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {sheetModalKind === 'asistencia' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Jugador *</label>
                <select
                  required
                  value={sf.jugadorId || ''}
                  onChange={e => setSf({ ...sf, jugadorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {jugadores.map(j => (
                    <option key={j.id} value={j.id}>{j.nombre} ({j.equipo})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={sf.fecha || ''}
                    onChange={e => setSf({ ...sf, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Estado</label>
                  <select
                    value={sf.estado || 'asiste'}
                    onChange={e => setSf({ ...sf, estado: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="asiste">Asiste</option>
                    <option value="no asiste">No asiste</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {sheetModalKind === 'estadistica' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Jugador *</label>
                <select
                  required
                  value={sf.jugadorId || ''}
                  onChange={e => setSf({ ...sf, jugadorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {jugadores.map(j => (
                    <option key={j.id} value={j.id}>{j.nombre} ({j.equipo})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Goles</label>
                  <input
                    type="number"
                    min={0}
                    value={sf.goles || '0'}
                    onChange={e => setSf({ ...sf, goles: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Asistencias</label>
                  <input
                    type="number"
                    min={0}
                    value={sf.asistencias || '0'}
                    onChange={e => setSf({ ...sf, asistencias: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tarjetas</label>
                  <input
                    type="number"
                    min={0}
                    value={sf.tarjetas || '0'}
                    onChange={e => setSf({ ...sf, tarjetas: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Partidos Jugados</label>
                  <input
                    type="number"
                    min={0}
                    value={sf.partidosJugados || '0'}
                    onChange={e => setSf({ ...sf, partidosJugados: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-150">
            <button
              type="button"
              onClick={() => {
                setSheetModalKind(null);
                setEditingSheetItem(null);
              }}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-orange-500/20"
            >
              {editingSheetItem ? 'Guardar Cambios' : 'Crear Registro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
