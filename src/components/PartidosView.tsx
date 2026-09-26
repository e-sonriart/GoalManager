import React, { useState, useMemo } from 'react';
import { useClub } from '../context/ClubContext';
import { Partido, CondicionPartido, TipoPartido, Equipo } from '../types';
import { Modal } from './Modal';
import { TeamShield } from './TeamShield';
import { resolveVisitorShield, DEFAULT_VISITOR_SHIELD } from '../utils/shieldPresets';
import { MatchHighlights } from './MatchHighlights';
import { eventsForPartido } from '../utils/matchHighlights';
import { useRemoteClocks } from '../hooks/useRemoteClocks';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Users,
  Download,
  CheckCircle2,
  ChevronDown,
  Clock,
  Shield,
  Home,
  Image,
  Plane,
  MapPin,
  Star,
  Play
} from 'lucide-react';
import { ActiveTab } from './Navbar';

interface PartidosViewProps {
  onNavigateToConvocatoria?: (partidoId: string) => void;
  onNavigateToAlineacion?: (partidoId: string) => void;
}

export const PartidosView: React.FC<PartidosViewProps> = ({
  onNavigateToConvocatoria,
  onNavigateToAlineacion
}) => {
  const {
    partidos,
    categorias,
    equipos,
    savePartido,
    deletePartido,
    exportSheet,
    getTeamEscudo,
    currentUser,
    can,
    allowedTabs
  } = useClub();

  const canManage = can('manage:partidos');
  const canGoConvocatoria = allowedTabs.includes('convocatorias');

  /** Relojes remotos: goles/tarjetas de partidos jugados en otro dispositivo */
  const remoteClocks = useRemoteClocks();

  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendientes' | 'finalizados'>('pendientes');
  const [filterCategoria, setFilterCategoria] = useState('');

  // Modal Crear / Editar Partido - Nuestro equipo como protagonista
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartido, setEditingPartido] = useState<Partido | null>(null);

  const [formEquipo, setFormEquipo] = useState('');
  const [formCondicion, setFormCondicion] = useState<CondicionPartido>('casa');
  const [formRival, setFormRival] = useState('');
  const [formRivalEscudo, setFormRivalEscudo] = useState('');
  const [formFecha, setFormFecha] = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formCampo, setFormCampo] = useState('');
  const [formTipo, setFormTipo] = useState<TipoPartido>('Liga');
  const [formJornada, setFormJornada] = useState<string | number>('');
  const [formHoraConvocatoria, setFormHoraConvocatoria] = useState('');

  const openAddModal = () => {
    setEditingPartido(null);
    const initialEquipo = currentUser?.equipo || equipos[0]?.nombre || 'Club';
    const foundEq = equipos.find(e => e.nombre === initialEquipo);
    const initialCat = foundEq?.categoria || categorias[0]?.nombre || 'Senior';

    setFormEquipo(initialEquipo);
    setFormCondicion('casa');
    setFormRival('');
    setFormRivalEscudo('');
    setFormCategoria(initialCat);
    setFormCampo('');
    setFormTipo('Liga');
    setFormJornada('');
    setFormHoraConvocatoria('');

    // Fecha por defecto: próximo fin de semana a las 17:00
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 5);
    nextDate.setHours(17, 0, 0, 0);
    setFormFecha(nextDate.toISOString().slice(0, 16));
    setIsModalOpen(true);
  };

  const openEditModal = (p: Partido) => {
    setEditingPartido(p);
    const clubTeam = p.equipo || (equipos.some(e => e.nombre === p.local) ? p.local : p.visitante);
    const isClubLocal = p.local === clubTeam;
    const cond: CondicionPartido = p.condicion || (isClubLocal ? 'casa' : 'fuera');
    const rivalName = p.rival || (cond === 'casa' ? p.visitante : p.local);

    setFormEquipo(clubTeam);
    setFormCondicion(cond);
    setFormRival(rivalName);
    setFormRivalEscudo(p.escudoVisitante || '');
    setFormFecha(p.fecha);
    setFormCategoria(p.categoria);
    setFormCampo(p.campo || '');
    setFormTipo(p.tipo || 'Liga');
    setFormJornada(p.jornada ?? '');
    setFormHoraConvocatoria(p.horaConvocatoria || '');
    setIsModalOpen(true);
  };

  const handleSavePartido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEquipo.trim() || !formRival.trim() || !formFecha) return;

    const isCasa = formCondicion === 'casa';
    const local = isCasa ? formEquipo.trim() : formRival.trim();
    const visitante = isCasa ? formRival.trim() : formEquipo.trim();

    await savePartido({
      id: editingPartido?.id,
      local,
      visitante,
      equipo: formEquipo.trim(),
      condicion: formCondicion,
      rival: formRival.trim(),
      escudoVisitante: formRivalEscudo.trim() || undefined,
      fecha: formFecha,
      categoria: formCategoria || (categorias[0]?.nombre ?? 'Senior'),
      campo: formCampo.trim() || undefined,
      tipo: formTipo,
      jornada: formTipo === 'Liga' ? (formJornada !== '' ? formJornada : undefined) : undefined,
      horaConvocatoria: formHoraConvocatoria.trim() || undefined
    });

    setIsModalOpen(false);
  };

  const handleDelete = async (p: Partido) => {
    if (confirm(`¿Eliminar el partido ${p.local} vs ${p.visitante}?`)) {
      await deletePartido(p.id);
    }
  };

  const filteredPartidos = useMemo(() => partidos.filter(p => {
    const matchCat = !filterCategoria || p.categoria === filterCategoria;
    if (filterStatus === 'pendientes') return matchCat && !p.finalizado;
    if (filterStatus === 'finalizados') return matchCat && Boolean(p.finalizado);
    return matchCat;
  }), [partidos, filterCategoria, filterStatus]);

  const [equipoExpandido, setEquipoExpandido] = useState<string | null>(null);

  interface EquipoConPartidos {
    equipo: Equipo;
    partidos: Partido[];
  }

  const tipoDeEquipo = (equipo: Equipo): 'F8' | 'F11' => {
    const cat = categorias.find(c => c.nombre === equipo.categoria);
    return cat?.tipo === 'F8' ? 'F8' : 'F11';
  };

  const clubTeamName = (p: Partido): string =>
    p.equipo || (equipos.some(e => e.nombre === p.local) ? p.local : p.visitante);

  const agruparPorEquipos = (tipo: 'F8' | 'F11', filtrados: Partido[]): EquipoConPartidos[] =>
    equipos
      .filter(eq => tipoDeEquipo(eq) === tipo)
      .map(eq => ({
        equipo: eq,
        partidos: filtrados.filter(p => clubTeamName(p) === eq.nombre)
      }))
      // Ocultar equipos sin partidos previstos en el filtro actual
      .filter(g => g.partidos.length > 0);

  const partidosPorDia = (partidos: Partido[]): [string, Partido[]][] => {
    const map = new Map<string, Partido[]>();
    [...partidos]
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
      .forEach(p => {
        const key = (p.fecha || '').slice(0, 10);
        const arr = map.get(key);
        if (arr) arr.push(p);
        else map.set(key, [p]);
      });
    return Array.from(map.entries());
  };

  const formatFechaLarga = (fechaStr: string): string => {
    const d = new Date(`${fechaStr}T12:00:00`);
    return !isNaN(d.getTime())
      ? d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
      : fechaStr;
  };

  const equiposF8 = useMemo(() => agruparPorEquipos('F8', filteredPartidos), [equipos, categorias, filteredPartidos]);
  const equiposF11 = useMemo(() => agruparPorEquipos('F11', filteredPartidos), [equipos, categorias, filteredPartidos]);

  const renderPartidoCard = (partido: Partido) => {
    const dateObj = new Date(partido.fecha);
    const dateStr = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
      : partido.fecha;
    const timeStr = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : '';

    const hasScore = partido.golesLocal !== '' && partido.golesLocal !== undefined;

    const clubTeam = partido.equipo || (equipos.some(e => e.nombre === partido.local) ? partido.local : partido.visitante);
    const isLocal = partido.local === clubTeam;
    const condicion: CondicionPartido = partido.condicion || (isLocal ? 'casa' : 'fuera');
    const esCasa = condicion === 'casa';

    return (
      <div
        key={partido.id}
        className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-150 shadow-sm hover:border-orange-200 transition-all space-y-3.5 min-w-0"
      >
        {/* Header card */}
        <div className="flex items-center justify-between gap-2 text-xs min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-orange-100 text-orange-800 text-[10px] tracking-wide shrink-0">
              {partido.categoria}
            </span>

            <span className="px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700 text-[10px] shrink-0">
              {partido.tipo || 'Liga'}
              {(!partido.tipo || partido.tipo === 'Liga') && partido.jornada && ` - J.${partido.jornada}`}
            </span>

            {/* Indicador de condición: Casa o Fuera */}
            {esCasa ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] shrink-0">
                <Home className="w-3 h-3 text-emerald-600 shrink-0" />
                En Casa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 text-[10px] shrink-0">
                <Plane className="w-3 h-3 text-blue-600 shrink-0" />
                Fuera
              </span>
            )}

            <span className="text-gray-500 font-bold text-[11px] truncate max-w-[120px]" title={clubTeam}>
              {clubTeam}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {partido.finalizado ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3 h-3 shrink-0" /> Finalizado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                <Clock className="w-3 h-3 shrink-0" /> Programado
              </span>
            )}

            <button
              onClick={() => openEditModal(partido)}
              title="Editar partido"
              className={`w-9 h-9 items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0 ${canManage ? 'flex' : 'hidden'}`}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(partido)}
              title="Eliminar partido"
              className={`w-9 h-9 items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 ${canManage ? 'flex' : 'hidden'}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scoreboard visual con escudos */}
        <div className="bg-gray-950 text-white rounded-2xl p-3.5 flex items-center justify-between shadow-inner border border-gray-800/80 min-w-0">
          {/* Equipo Local */}
          <div className="flex flex-col items-center text-center flex-1 min-w-0 px-1">
            <div className={`w-11 h-11 rounded-2xl bg-white/10 p-1 flex items-center justify-center border shadow-sm mb-1.5 overflow-hidden shrink-0 ${
              partido.local === clubTeam
                ? 'border-orange-500 ring-2 ring-orange-500/40 bg-orange-950/30'
                : 'border-white/20'
            }`}>
              <TeamShield
                escudoUrl={partido.local === clubTeam ? getTeamEscudo(partido.local) : resolveVisitorShield(partido)}
                teamName={partido.local}
                size="md"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="font-bold text-xs sm:text-sm truncate w-full font-athletic tracking-wide" title={partido.local}>
              {partido.local}
            </p>
          </div>

          {/* Marcador Central */}
          <div className="px-1 sm:px-3 text-center shrink min-w-0 sm:min-w-[75px]">
            {hasScore ? (
              <div className="text-xl sm:text-2xl font-black font-athletic text-orange-400 tracking-wider whitespace-nowrap">
                {partido.golesLocal} - {partido.golesVisitante}
              </div>
            ) : (
              <div className="text-base font-black font-athletic text-gray-400">VS</div>
            )}
            <div className="text-[9px] sm:text-[10px] text-gray-400 mt-1 flex flex-wrap items-center justify-center gap-x-1 leading-tight font-medium">
              <Clock className="w-2.5 h-2.5 text-orange-400 shrink-0" />
              <span className="whitespace-nowrap">{dateStr}</span>
              <span className="whitespace-nowrap">{timeStr}</span>
            </div>
            {partido.horaConvocatoria && (
              <div className="text-[9px] text-orange-400 mt-0.5 font-bold whitespace-nowrap">
                Conv: {partido.horaConvocatoria}
              </div>
            )}
            {partido.campo && (
              <div className="text-[9px] text-gray-400 mt-0.5 flex items-center justify-center gap-0.5 font-medium max-w-[90px] sm:max-w-[120px] truncate mx-auto" title={partido.campo}>
                <MapPin className="w-2.5 h-2.5 text-orange-400 shrink-0" />
                <span className="truncate">{partido.campo}</span>
              </div>
            )}
          </div>

          {/* Equipo Visitante */}
          <div className="flex flex-col items-center text-center flex-1 min-w-0 px-1">
            <div className={`w-11 h-11 rounded-2xl bg-white/10 p-1 flex items-center justify-center border shadow-sm mb-1.5 overflow-hidden shrink-0 ${
              partido.visitante === clubTeam
                ? 'border-orange-500 ring-2 ring-orange-500/40 bg-orange-950/30'
                : 'border-white/20'
            }`}>
              <TeamShield
                escudoUrl={partido.visitante === clubTeam ? getTeamEscudo(partido.visitante) : resolveVisitorShield(partido)}
                teamName={partido.visitante}
                size="md"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="font-bold text-xs sm:text-sm truncate w-full font-athletic tracking-wide" title={partido.visitante}>
              {partido.visitante}
            </p>
          </div>
        </div>

        {/* Acciones destacadas bajo el resultado (goles/tarjetas cronológicos) */}
        <MatchHighlights events={eventsForPartido(partido, remoteClocks)} tone="dark" standalone />

        {/* Action Buttons: Convocar / Convocados + Comenzar */}
        {canGoConvocatoria && (
          <div className={`grid gap-2 pt-0.5 text-xs font-bold ${
            (partido.convocados && partido.convocados.length > 0) ? 'grid-cols-2' : 'grid-cols-1'
          }`}>
            {(partido.convocados && partido.convocados.length > 0) ? (
              <>
                <button
                  onClick={() => onNavigateToConvocatoria && onNavigateToConvocatoria(partido.id)}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors text-center flex items-center justify-center gap-1.5 truncate shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Convocados</span>
                </button>
                <button
                  onClick={() => {
                    if (onNavigateToAlineacion) {
                      onNavigateToAlineacion(partido.id);
                    } else {
                      onNavigateToConvocatoria && onNavigateToConvocatoria(partido.id);
                    }
                  }}
                  className="py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors text-center flex items-center justify-center gap-1.5 truncate shadow-md shadow-orange-500/20"
                >
                  <Play className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Alineación</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => onNavigateToConvocatoria && onNavigateToConvocatoria(partido.id)}
                className="py-2 px-3 bg-gray-900 hover:bg-black text-white rounded-xl transition-colors text-center flex items-center justify-center gap-1.5 truncate shadow-sm"
              >
                <Users className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="truncate">Convocar</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-athletic tracking-tight">
            CALENDARIO DE <span className="text-orange-600">PARTIDOS</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Programa enfrentamientos, actualiza marcadores y conecta con convocatorias y porras.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportSheet('partidos')}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Exportar Partidos
          </button>
          {canManage && (
            <button
              id="btn-add-partido"
              onClick={openAddModal}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nuevo Partido
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterStatus('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              filterStatus === 'todos'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({partidos.length})
          </button>
          <button
            onClick={() => setFilterStatus('pendientes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              filterStatus === 'pendientes'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Por Jugar ({partidos.filter(p => !p.finalizado).length})
          </button>
          <button
            onClick={() => setFilterStatus('finalizados')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              filterStatus === 'finalizados'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Finalizados ({partidos.filter(p => p.finalizado).length})
          </button>
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={filterCategoria}
            onChange={e => setFilterCategoria(e.target.value)}
            className="w-full sm:w-48 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            <option value="">Todas las Categorías</option>
            {categorias.map(c => (
              <option key={c.id} value={c.nombre}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Partidos agrupados por equipo (F8/F11) y por días */}
      {equiposF8.length === 0 && equiposF11.length === 0 ? (
        <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-150">
          <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-semibold">No se encontraron partidos en esta sección.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { tipo: 'F8' as const, grupos: equiposF8, badgeCls: 'bg-emerald-100 text-emerald-800' },
            { tipo: 'F11' as const, grupos: equiposF11, badgeCls: 'bg-blue-100 text-blue-800' }
          ].map(seccion =>
            seccion.grupos.length === 0 ? null : (
              <section key={seccion.tipo} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-widest shrink-0 ${seccion.badgeCls}`}>
                    {seccion.tipo}
                  </span>
                  <h2 className="text-sm font-bold text-gray-800 font-athletic tracking-wide uppercase truncate">
                    Categoría {Array.from(new Set(seccion.grupos.map(g => g.equipo.categoria))).join(' · ')}
                  </h2>
                </div>

                <div className="space-y-3">
                  {seccion.grupos.map(({ equipo, partidos }) => (
                    <React.Fragment key={equipo.id}>
                      <button
                        onClick={() => setEquipoExpandido(equipoExpandido === equipo.nombre ? null : equipo.nombre)}
                        className={`w-full text-left bg-gray-900 text-white p-4 sm:p-5 rounded-2xl border transition-all min-w-0 overflow-hidden ${
                          equipoExpandido === equipo.nombre
                            ? 'border-orange-500 ring-2 ring-orange-500/30'
                            : 'border-gray-800 hover:border-orange-400'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-white/10 p-1 flex items-center justify-center overflow-hidden shrink-0 border border-white/20">
                            <TeamShield
                              escudoUrl={getTeamEscudo(equipo.nombre)}
                              teamName={equipo.nombre}
                              size="md"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="text-base font-bold font-athletic truncate" title={equipo.nombre}>
                                {equipo.nombre}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-full font-black text-[10px] tracking-widest shrink-0 ${
                                seccion.tipo === 'F8'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                              }`}>
                                {seccion.tipo}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {partidos.length === 0
                                ? 'Sin partidos aún'
                                : `${partidos.length} partido${partidos.length !== 1 ? 's' : ''}`}
                              {(equipo.division || equipo.grupo) && (
                                <span className="ml-2 text-gray-500">
                                  {[equipo.division, equipo.grupo].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${equipoExpandido === equipo.nombre ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {equipoExpandido === equipo.nombre && (
                        <div className="space-y-3">
                          {partidos.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-150 py-8 text-center text-sm text-gray-400">
                              <Calendar className="w-6 h-6 mx-auto text-gray-300 mb-1.5" />
                              Sin partidos aún
                            </div>
                          ) : (
                            partidosPorDia(partidos).map(([fecha, lista]) => (
                              <div key={fecha} className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                  <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide capitalize">
                                    {formatFechaLarga(fecha)}
                                  </h3>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600 shrink-0">
                                    {lista.length} partido{lista.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {lista.map(partido => renderPartidoCard(partido))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      )}

      {/* Modal Añadir / Editar Partido - Nuestro Equipo como Protagonista */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPartido ? 'Editar Partido' : 'Programar Partido del Club'}
        subtitle="Nuestro equipo es el protagonista: elige condición (casa o fuera) y rival"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSavePartido} className="space-y-4">
          {/* 1. Selección de Nuestro Equipo del Club (Protagonista) */}
          <div className="bg-orange-50/70 p-3.5 rounded-2xl border border-orange-200 space-y-2.5">
            <label className="block text-xs font-bold text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
              1. Nuestro Equipo del Club (Protagonista) *
            </label>
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-white border border-orange-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
                <TeamShield
                  escudoUrl={getTeamEscudo(formEquipo)}
                  teamName={formEquipo || 'Nuestro Club'}
                  size="sm"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <select
                  value={formEquipo}
                  onChange={e => {
                    const selName = e.target.value;
                    setFormEquipo(selName);
                    const found = equipos.find(eq => eq.nombre === selName);
                    if (found?.categoria) {
                      setFormCategoria(found.categoria);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-orange-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {equipos.map(eq => (
                    <option key={eq.id} value={eq.nombre}>
                      {eq.nombre} {eq.ano ? `(${eq.ano})` : ''} - {eq.categoria}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-orange-700 mt-1">
                  Categoría asignada: <strong className="font-bold">{formCategoria || 'Sin categoría'}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* 2. Condición: ¿Dónde juega nuestro equipo? (Casa o Fuera) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              2. ¿Dónde juega nuestro equipo? *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormCondicion('casa')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  formCondicion === 'casa'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 text-emerald-950 shadow-xs'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  formCondicion === 'casa' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Home className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs">Juega en Casa</div>
                  <div className="text-[10px] text-gray-500 truncate">Nuestro equipo es Local</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormCondicion('fuera')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  formCondicion === 'fuera'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400 text-blue-950 shadow-xs'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  formCondicion === 'fuera' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Plane className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs">Juega Fuera</div>
                  <div className="text-[10px] text-gray-500 truncate">Nuestro equipo es Visitante</div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Equipo contra quien juega (Rival) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              3. Equipo Rival (contra quien juega) *
            </label>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 p-0.5 flex items-center justify-center shrink-0">
                <TeamShield
                  escudoUrl={formRivalEscudo.trim() || DEFAULT_VISITOR_SHIELD}
                  teamName={formRival || 'Rival'}
                  size="xs"
                  className="w-full h-full"
                />
              </div>
              <input
                type="text"
                required
                placeholder="Ej: C.D. Móstoles, Rayo Vallecano B, C.F. Fuenlabrada..."
                value={formRival}
                onChange={e => setFormRival(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Image className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="url"
                placeholder="Link del escudo del rival (opcional)"
                value={formRivalEscudo}
                onChange={e => setFormRivalEscudo(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Campo de Juego / Instalación */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Campo / Estadio (Opcional)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={formCondicion === 'casa' ? 'Ej: Municipal El Naranjal - Campo 1' : 'Ej: Polideportivo Municipal Rival'}
                value={formCampo}
                onChange={e => setFormCampo(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 5. Fecha, Hora y Hora Convocatoria */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Fecha y Hora Partido *
              </label>
              <input
                type="datetime-local"
                required
                value={formFecha}
                onChange={e => setFormFecha(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Hora Conv.
              </label>
              <input
                type="time"
                value={formHoraConvocatoria}
                onChange={e => setFormHoraConvocatoria(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 6. Categoría, Tipo de Partido y Jornada */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Categoría
              </label>
              <select
                value={formCategoria}
                onChange={e => setFormCategoria(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {categorias.map(c => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Tipo *
              </label>
              <select
                value={formTipo}
                onChange={e => {
                  const val = e.target.value as TipoPartido;
                  setFormTipo(val);
                  if (val !== 'Liga') setFormJornada('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="Liga">Liga</option>
                <option value="Amistoso">Amistoso</option>
                <option value="Torneo">Torneo</option>
              </select>
            </div>

            {formTipo === 'Liga' ? (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Jornada *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 12"
                  value={formJornada}
                  onChange={e => setFormJornada(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            ) : <div />}
          </div>

          {/* Vista Previa del Encuentro */}
          <div className="bg-gray-900 text-white p-3 rounded-xl border border-gray-800 text-center">
            <div className="text-[10px] uppercase font-bold text-orange-400 tracking-wider mb-1">
              Vista previa del enfrentamiento
            </div>
            <div className="flex items-center justify-center gap-3 text-xs font-athletic">
              <span className={`font-bold truncate max-w-[130px] ${formCondicion === 'casa' ? 'text-orange-400' : 'text-gray-300'}`}>
                {formCondicion === 'casa' ? formEquipo || 'Nuestro Club' : formRival || 'Rival'}
                {formCondicion === 'casa' && ' (Casa)'}
              </span>
              <span className="text-gray-500 font-black">VS</span>
              <span className={`font-bold truncate max-w-[130px] ${formCondicion === 'fuera' ? 'text-orange-400' : 'text-gray-300'}`}>
                {formCondicion === 'fuera' ? formEquipo || 'Nuestro Club' : formRival || 'Rival'}
                {formCondicion === 'fuera' && ' (Fuera)'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-150">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-orange-500/20"
            >
              Guardar Partido
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
