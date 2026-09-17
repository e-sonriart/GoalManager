import React, { useState } from 'react';
import { useClub } from '../context/ClubContext';
import { Partido, CondicionPartido, TipoPartido } from '../types';
import { Modal } from './Modal';
import { TeamShield } from './TeamShield';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Users,
  Download,
  CheckCircle2,
  Clock,
  Shield,
  Home,
  Plane,
  MapPin,
  Star
} from 'lucide-react';
import { ActiveTab } from './Navbar';

interface PartidosViewProps {
  onNavigateToConvocatoria?: (partidoId: string) => void;
}

export const PartidosView: React.FC<PartidosViewProps> = ({
  onNavigateToConvocatoria
}) => {
  const {
    partidos,
    categorias,
    equipos,
    savePartido,
    deletePartido,
    exportSheet,
    getTeamEscudo,
    currentUser
  } = useClub();

  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendientes' | 'finalizados'>('todos');
  const [filterCategoria, setFilterCategoria] = useState('');

  // Modal Crear / Editar Partido - Nuestro equipo como protagonista
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartido, setEditingPartido] = useState<Partido | null>(null);

  const [formEquipo, setFormEquipo] = useState('');
  const [formCondicion, setFormCondicion] = useState<CondicionPartido>('casa');
  const [formRival, setFormRival] = useState('');
  const [formFecha, setFormFecha] = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formCampo, setFormCampo] = useState('');
  const [formTipo, setFormTipo] = useState<TipoPartido>('Liga');
  const [formJornada, setFormJornada] = useState<string | number>('');
  const [formHoraConvocatoria, setFormHoraConvocatoria] = useState('');

  // Modal Resultado
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedPartidoResult, setSelectedPartidoResult] = useState<Partido | null>(null);
  const [golesEquipoClub, setGolesEquipoClub] = useState<string | number>('');
  const [golesRival, setGolesRival] = useState<string | number>('');
  const [isFinalizado, setIsFinalizado] = useState(false);

  const openAddModal = () => {
    setEditingPartido(null);
    const initialEquipo = currentUser?.equipo || equipos[0]?.nombre || 'Club';
    const foundEq = equipos.find(e => e.nombre === initialEquipo);
    const initialCat = foundEq?.categoria || categorias[0]?.nombre || 'Senior';

    setFormEquipo(initialEquipo);
    setFormCondicion('casa');
    setFormRival('');
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
    setFormFecha(p.fecha);
    setFormCategoria(p.categoria);
    setFormCampo(p.campo || '');
    setFormTipo(p.tipo || 'Liga');
    setFormJornada(p.jornada ?? '');
    setFormHoraConvocatoria(p.horaConvocatoria || '');
    setIsModalOpen(true);
  };

  const openResultModal = (p: Partido) => {
    setSelectedPartidoResult(p);
    const clubTeam = p.equipo || (equipos.some(e => e.nombre === p.local) ? p.local : p.visitante);
    const isClubLocal = p.local === clubTeam;

    const gClub = isClubLocal ? p.golesLocal : p.golesVisitante;
    const gRiv = isClubLocal ? p.golesVisitante : p.golesLocal;

    setGolesEquipoClub(gClub ?? '');
    setGolesRival(gRiv ?? '');
    setIsFinalizado(Boolean(p.finalizado));
    setIsResultModalOpen(true);
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
      fecha: formFecha,
      categoria: formCategoria || (categorias[0]?.nombre ?? 'Senior'),
      campo: formCampo.trim() || undefined,
      tipo: formTipo,
      jornada: formTipo === 'Liga' ? (formJornada !== '' ? formJornada : undefined) : undefined,
      horaConvocatoria: formHoraConvocatoria.trim() || undefined
    });

    setIsModalOpen(false);
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartidoResult) return;

    const clubTeam = selectedPartidoResult.equipo || (equipos.some(e => e.nombre === selectedPartidoResult.local) ? selectedPartidoResult.local : selectedPartidoResult.visitante);
    const isClubLocal = selectedPartidoResult.local === clubTeam;

    const gLocal = isClubLocal
      ? (golesEquipoClub === '' ? '' : Number(golesEquipoClub))
      : (golesRival === '' ? '' : Number(golesRival));
    const gVisitante = isClubLocal
      ? (golesRival === '' ? '' : Number(golesRival))
      : (golesEquipoClub === '' ? '' : Number(golesEquipoClub));

    await savePartido({
      ...selectedPartidoResult,
      golesLocal: gLocal,
      golesVisitante: gVisitante,
      finalizado: isFinalizado
    });

    setIsResultModalOpen(false);
  };

  const handleDelete = async (p: Partido) => {
    if (confirm(`¿Eliminar el partido ${p.local} vs ${p.visitante}?`)) {
      await deletePartido(p.id);
    }
  };

  const filteredPartidos = partidos.filter(p => {
    const matchCat = !filterCategoria || p.categoria === filterCategoria;
    if (filterStatus === 'pendientes') return matchCat && !p.finalizado;
    if (filterStatus === 'finalizados') return matchCat && Boolean(p.finalizado);
    return matchCat;
  });

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

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSheet('partidos')}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Exportar Partidos
          </button>
          <button
            id="btn-add-partido"
            onClick={openAddModal}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nuevo Partido
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
        <div className="flex items-center gap-2">
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

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredPartidos.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-150">
            <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold">No se encontraron partidos en esta sección.</p>
          </div>
        ) : (
          filteredPartidos.map(partido => {
            const dateObj = new Date(partido.fecha);
            const dateStr = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
              : partido.fecha;
            const timeStr = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
              : '';

            const hasScore = partido.golesLocal !== '' && partido.golesLocal !== undefined;

            // Identificar equipo protagonista del club y condición
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
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(partido)}
                      title="Eliminar partido"
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
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
                        escudoUrl={getTeamEscudo(partido.local)}
                        teamName={partido.local}
                        size="md"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="font-bold text-xs sm:text-sm truncate w-full font-athletic tracking-wide" title={partido.local}>
                      {partido.local}
                    </p>
                    {partido.local === clubTeam ? (
                      <span className="text-[9px] font-extrabold text-orange-400 uppercase tracking-wider flex items-center gap-0.5 justify-center">
                        <Star className="w-2.5 h-2.5 fill-orange-400" /> Nuestro Club
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                        Rival
                      </span>
                    )}
                  </div>

                  {/* Marcador Central */}
                  <div className="px-2 sm:px-3 text-center shrink-0 min-w-[75px]">
                    {hasScore ? (
                      <div className="text-xl sm:text-2xl font-black font-athletic text-orange-400 tracking-wider">
                        {partido.golesLocal} - {partido.golesVisitante}
                      </div>
                    ) : (
                      <div className="text-base font-black font-athletic text-gray-400">VS</div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-center gap-1 font-medium whitespace-nowrap">
                      <Clock className="w-2.5 h-2.5 text-orange-400 shrink-0" />
                      <span>{dateStr} {timeStr}</span>
                    </div>
                    {partido.horaConvocatoria && (
                      <div className="text-[9px] text-orange-400 mt-0.5 font-bold whitespace-nowrap">
                        Conv: {partido.horaConvocatoria}
                      </div>
                    )}
                    {partido.campo && (
                      <div className="text-[9px] text-gray-400 mt-0.5 flex items-center justify-center gap-0.5 font-medium max-w-[120px] truncate mx-auto" title={partido.campo}>
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
                        escudoUrl={getTeamEscudo(partido.visitante)}
                        teamName={partido.visitante}
                        size="md"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="font-bold text-xs sm:text-sm truncate w-full font-athletic tracking-wide" title={partido.visitante}>
                      {partido.visitante}
                    </p>
                    {partido.visitante === clubTeam ? (
                      <span className="text-[9px] font-extrabold text-orange-400 uppercase tracking-wider flex items-center gap-0.5 justify-center">
                        <Star className="w-2.5 h-2.5 fill-orange-400" /> Nuestro Club
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                        Rival
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-0.5 text-xs font-bold">
                  <button
                    onClick={() => openResultModal(partido)}
                    className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition-colors text-center truncate flex items-center justify-center gap-1.5"
                  >
                    {hasScore ? 'Editar Marcador' : 'Anotar Marcador'}
                  </button>

                  <button
                    onClick={() => onNavigateToConvocatoria && onNavigateToConvocatoria(partido.id)}
                    className="py-2 px-3 bg-gray-900 hover:bg-black text-white rounded-xl transition-colors text-center flex items-center justify-center gap-1.5 truncate shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="truncate">Convocatoria</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

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
                  escudoUrl={getTeamEscudo(formRival)}
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

      {/* Modal Resultado del Partido */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        title="Registrar Marcador Oficial"
        subtitle={`${selectedPartidoResult?.local} vs ${selectedPartidoResult?.visitante}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveResult} className="space-y-4">
          {(() => {
            if (!selectedPartidoResult) return null;
            const clubTeam = selectedPartidoResult.equipo || (equipos.some(e => e.nombre === selectedPartidoResult.local) ? selectedPartidoResult.local : selectedPartidoResult.visitante);
            const isClubLocal = selectedPartidoResult.local === clubTeam;
            const rivalName = selectedPartidoResult.rival || (isClubLocal ? selectedPartidoResult.visitante : selectedPartidoResult.local);

            return (
              <div className="grid grid-cols-2 gap-3 text-center">
                {/* Goles Nuestro Club */}
                <div className="bg-orange-50/70 p-3 rounded-2xl border border-orange-200">
                  <div className="text-[10px] font-bold uppercase text-orange-600 flex items-center justify-center gap-1 mb-1">
                    <Star className="w-3 h-3 fill-orange-500" /> Nuestro Club
                  </div>
                  <label className="block text-xs font-bold text-gray-900 truncate mb-1.5" title={clubTeam}>
                    {clubTeam}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={golesEquipoClub}
                    onChange={e => setGolesEquipoClub(e.target.value)}
                    className="w-full py-2.5 border border-orange-300 bg-white rounded-xl text-center text-3xl font-black font-athletic text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                {/* Goles Rival */}
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                  <div className="text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Equipo Rival
                  </div>
                  <label className="block text-xs font-bold text-gray-700 truncate mb-1.5" title={rivalName}>
                    {rivalName}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={golesRival}
                    onChange={e => setGolesRival(e.target.value)}
                    className="w-full py-2.5 border border-gray-300 bg-white rounded-xl text-center text-3xl font-black font-athletic text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            );
          })()}

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-200">
              <input
                type="checkbox"
                checked={isFinalizado}
                onChange={e => setIsFinalizado(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <span>Marcar partido como Finalizado (cerrará actas y puntuará porras)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-150">
            <button
              type="button"
              onClick={() => setIsResultModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-orange-500/20"
            >
              Guardar Marcador
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
