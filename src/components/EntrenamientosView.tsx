import React, { useState, useMemo } from 'react';
import { useClub } from '../context/ClubContext';
import { SesionEntrenamiento, TipoFutbol } from '../types';
import { Modal } from './Modal';
import { TeamShield } from './TeamShield';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Download,
  Clock,
  ChevronDown,
  MapPin,
  Dumbbell,
  Target,
  Users
} from 'lucide-react';

const formatFecha = (fechaStr: string): string => {
  const dateObj = new Date(`${fechaStr}T12:00:00`);
  return !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    : fechaStr;
};

const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const EntrenamientosView: React.FC = () => {
  const {
    sesiones,
    equipos,
    categorias,
    saveSesion,
    deleteSesion,
    exportSheet,
    getTeamEscudo,
    currentUser,
    can,
    clubConfig
  } = useClub();

  const canManage = can('manage:entrenamientos');

  const [filterCategoria, setFilterCategoria] = useState('');
  const [sesionEquipoExpandido, setSesionEquipoExpandido] = useState<string | null>(null);

  // Modal Crear / Editar Sesión
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSesion, setEditingSesion] = useState<SesionEntrenamiento | null>(null);

  const [formEquipo, setFormEquipo] = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formTipo, setFormTipo] = useState<TipoFutbol>('F11');
  const [formFecha, setFormFecha] = useState('');
  const [formHora, setFormHora] = useState('');
  const [formHoraFin, setFormHoraFin] = useState('');
  const [formLugar, setFormLugar] = useState('');
  const [formTitulo, setFormTitulo] = useState('');
  const [formObjetivo, setFormObjetivo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');

  const openAddModal = () => {
    setEditingSesion(null);
    const initialEquipo = currentUser?.equipo || equipos[0]?.nombre || '';
    const foundEq = equipos.find(e => e.nombre === initialEquipo);

    setFormEquipo(initialEquipo);
    setFormCategoria(foundEq?.categoria || categorias[0]?.nombre || '');
    const catIni = categorias.find(c => c.nombre === (foundEq?.categoria || categorias[0]?.nombre));
    setFormTipo(catIni?.tipo || (foundEq ? (categorias.some(c => c.nombre === foundEq.categoria && c.tipo === 'F8') ? 'F8' : 'F11') : 'F11'));

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    setFormFecha(toISODate(nextDate));
    setFormHora('18:00');
    setFormHoraFin('');
    setFormLugar('');
    setFormTitulo('');
    setFormObjetivo('');
    setFormDescripcion('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: SesionEntrenamiento) => {
    setEditingSesion(s);
    setFormEquipo(s.equipo);
    setFormCategoria(s.categoria || '');
    setFormTipo(s.tipo || 'F11');
    setFormFecha(s.fecha);
    setFormHora(s.hora);
    setFormHoraFin(s.horaFin || '');
    setFormLugar(s.lugar || '');
    setFormTitulo(s.titulo || '');
    setFormObjetivo(s.objetivo);
    setFormDescripcion(s.descripcion || '');
    setIsModalOpen(true);
  };

  const applyEquipo = (selName: string) => {
    setFormEquipo(selName);
    const found = equipos.find(eq => eq.nombre === selName);
    if (found?.categoria) {
      setFormCategoria(found.categoria);
      const cat = categorias.find(c => c.nombre === found.categoria);
      if (cat?.tipo) setFormTipo(cat.tipo);
    }
  };

  const handleSaveSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEquipo.trim() || !formObjetivo.trim() || !formFecha || !formHora) return;

    await saveSesion({
      ...(editingSesion
        ? { id: editingSesion.id, temporada: editingSesion.temporada, creadoPor: editingSesion.creadoPor, creadoEn: editingSesion.creadoEn }
        : { temporada: clubConfig?.temporada, creadoPor: currentUser?.nombre, creadoEn: new Date().toISOString() }),
      equipo: formEquipo.trim(),
      categoria: formCategoria.trim() || categorias[0]?.nombre || formEquipo.trim(),
      tipo: formTipo,
      fecha: formFecha,
      hora: formHora,
      horaFin: formHoraFin.trim() || undefined,
      lugar: formLugar.trim() || undefined,
      titulo: formTitulo.trim() || undefined,
      objetivo: formObjetivo.trim(),
      descripcion: formDescripcion.trim() || undefined
    });

    setIsModalOpen(false);
  };

  const handleDelete = async (s: SesionEntrenamiento) => {
    if (confirm(`¿Eliminar la sesión del ${formatFecha(s.fecha)} (${s.equipo})?`)) {
      await deleteSesion(s.id);
    }
  };

  const gruposPorFecha = useMemo(() => {
    const visible = sesiones.filter(s => !filterCategoria || s.categoria === filterCategoria);
    const map = new Map<string, SesionEntrenamiento[]>();
    visible.forEach(s => {
      const key = s.fecha || 'sin fecha';
      const arr = map.get(key);
      if (arr) arr.push(s);
      else map.set(key, [s]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [sesiones, filterCategoria]);

  const sesionEquipoKey = (fecha: string, equipo: string): string => `${fecha}|${equipo}`;

  const sesionesPorEquipo = (items: SesionEntrenamiento[]): [string, SesionEntrenamiento[]][] => {
    const map = new Map<string, SesionEntrenamiento[]>();
    [...items]
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
      .forEach(s => {
        const key = s.equipo || 'Sin equipo';
        const arr = map.get(key);
        if (arr) arr.push(s);
        else map.set(key, [s]);
      });
    return Array.from(map.entries());
  };

  const tipoDeEquipo = (nombre: string): TipoFutbol => {
    const eq = equipos.find(e => e.nombre === nombre);
    const cat = eq ? categorias.find(c => c.nombre === eq.categoria) : undefined;
    return cat?.tipo === 'F8' ? 'F8' : 'F11';
  };

  const renderSesionCard = (sesion: SesionEntrenamiento) => (
    <div
      key={sesion.id}
      className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-150 shadow-sm hover:border-orange-200 transition-all space-y-3 min-w-0 flex flex-col"
    >
      {/* Cabecera de la tarjeta */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="px-2.5 py-0.5 rounded-full font-bold bg-orange-100 text-orange-800 text-[10px] tracking-wide shrink-0">
            {sesion.categoria || 'Sin categoría'}
          </span>
          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${
            sesion.tipo === 'F8'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {sesion.tipo || 'Fútbol'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {canManage && (
            <>
              <button
                onClick={() => openEditModal(sesion)}
                title="Editar sesión"
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(sesion)}
                title="Eliminar sesión"
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Equipo */}
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
          <TeamShield
            escudoUrl={getTeamEscudo(sesion.equipo)}
            teamName={sesion.equipo || 'Equipo'}
            size="sm"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-gray-900 font-athletic tracking-wide truncate" title={sesion.equipo}>
            {sesion.equipo || 'Equipo'}
          </p>
          {sesion.titulo && (
            <p className="text-[11px] text-orange-600 font-semibold truncate" title={sesion.titulo}>
              <Target className="w-3 h-3 inline mr-1 text-orange-500" />
              {sesion.titulo}
            </p>
          )}
        </div>
      </div>

      {/* Fecha y hora */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-150 space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 font-bold text-gray-800 uppercase tracking-wider text-[11px]">
            <Users className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            {formatFecha(sesion.fecha)}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-gray-600 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            {sesion.hora}
            {sesion.horaFin ? ` - ${sesion.horaFin}` : ''}
          </span>
        </div>
        {sesion.lugar && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500" title={sesion.lugar}>
            <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
            <span className="truncate">{sesion.lugar}</span>
          </div>
        )}
      </div>

      {/* Objetivo */}
      <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3 flex-1">
        <div className="text-[10px] font-bold uppercase text-orange-600 flex items-center gap-1 mb-1">
          <Target className="w-3 h-3 shrink-0" /> Objetivo
        </div>
        <p className="text-xs text-gray-800 font-medium leading-relaxed">{sesion.objetivo}</p>
      </div>

      {sesion.descripcion && (
        <p className="text-xs text-gray-500 leading-relaxed border-l-2 border-orange-300 pl-3">
          {sesion.descripcion}
        </p>
      )}

      {sesion.temporada && (
        <div className="pt-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider border-t border-gray-100">
          Temp. {sesion.temporada}
          {sesion.creadoPor ? ` · Creada por ${sesion.creadoPor}` : ''}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-athletic tracking-tight">
            SESIONES DE <span className="text-orange-600">ENTRENAMIENTO</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Planifica las sesiones de cada equipo: fecha, horario, lugar y objetivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportSheet('sesiones')}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Exportar Sesiones
          </button>
          {canManage && (
            <button
              id="btn-add-sesion"
              onClick={openAddModal}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nueva Sesión
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
          <Dumbbell className="w-4 h-4 text-orange-500 shrink-0" />
          <span>{sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''} planificada{sesiones.length !== 1 ? 's' : ''}</span>
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

      {/* Sesiones agrupadas por fecha y, dentro de cada fecha, por equipo */}
      {gruposPorFecha.length === 0 ? (
        <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-150">
          <Dumbbell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-semibold">No hay sesiones de entrenamiento en esta sección.</p>
        </div>
      ) : (
        gruposPorFecha.map(([fecha, items]) => (
          <div key={fecha} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
              <h2 className="text-sm font-bold text-gray-800 font-athletic tracking-wide uppercase capitalize">
                {formatFecha(fecha)}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600 shrink-0">
                {items.length} sesión{items.length !== 1 ? 'es' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {sesionesPorEquipo(items).map(([equipo, sesionesEquipo]) => {
                const expandido = sesionEquipoExpandido === sesionEquipoKey(fecha, equipo);
                const tipo = sesionesEquipo[0]?.tipo || tipoDeEquipo(equipo);
                return (
                  <React.Fragment key={equipo}>
                    <button
                      onClick={() => setSesionEquipoExpandido(expandido ? null : sesionEquipoKey(fecha, equipo))}
                      className={`w-full text-left bg-gray-900 text-white p-4 sm:p-5 rounded-2xl border transition-all min-w-0 overflow-hidden ${
                        expandido
                          ? 'border-orange-500 ring-2 ring-orange-500/30'
                          : 'border-gray-800 hover:border-orange-400'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 p-1 flex items-center justify-center overflow-hidden shrink-0 border border-white/20">
                          <TeamShield
                            escudoUrl={getTeamEscudo(equipo)}
                            teamName={equipo}
                            size="md"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="text-base font-bold font-athletic truncate" title={equipo}>
                              {equipo}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full font-black text-[10px] tracking-widest shrink-0 ${
                              tipo === 'F8'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                            }`}>
                              {tipo}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {sesionesEquipo.length} sesión{sesionesEquipo.length !== 1 ? 'es' : ''}
                          </p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expandido ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {expandido && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {sesionesEquipo.map(sesion => renderSesionCard(sesion))}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Modal Añadir / Editar Sesión */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSesion ? 'Editar Sesión' : 'Programar Sesión de Entrenamiento'}
        subtitle="Planifica la sesión de un equipo del club: fecha, horario y objetivo"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveSesion} className="space-y-4">
          {/* 1. Equipo, Categoría y Tipo */}
          <div className="bg-orange-50/70 p-3.5 rounded-2xl border border-orange-200 space-y-2.5">
            <label className="block text-xs font-bold text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-orange-600" />
              1. Equipo del Club *
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
                  onChange={e => applyEquipo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-orange-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {equipos.map(eq => (
                    <option key={eq.id} value={eq.nombre}>
                      {eq.nombre} {eq.ano ? `(${eq.ano})` : ''} - {eq.categoria}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-orange-800 uppercase tracking-wider mb-1">
                  Categoría
                </label>
                <select
                  value={formCategoria}
                  onChange={e => {
                    setFormCategoria(e.target.value);
                    const cat = categorias.find(c => c.nombre === e.target.value);
                    if (cat?.tipo) setFormTipo(cat.tipo);
                  }}
                  className="w-full px-3 py-2 bg-white border border-orange-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {categorias.map(c => (
                    <option key={c.id} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-orange-800 uppercase tracking-wider mb-1">
                  Modalidad (F8/F11)
                </label>
                <select
                  value={formTipo}
                  onChange={e => setFormTipo(e.target.value as TipoFutbol)}
                  className="w-full px-3 py-2 bg-white border border-orange-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="F11">F11</option>
                  <option value="F8">F8</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Fecha, Hora Inicio y Fin */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Fecha *
              </label>
              <input
                type="date"
                required
                value={formFecha}
                onChange={e => setFormFecha(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Inicio *
              </label>
              <input
                type="time"
                required
                value={formHora}
                onChange={e => setFormHora(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Fin (Opcional)
              </label>
              <input
                type="time"
                value={formHoraFin}
                onChange={e => setFormHoraFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Lugar y Título */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Lugar (Opcional)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Ej: Campo Municipal 1"
                  value={formLugar}
                  onChange={e => setFormLugar(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Título de la sesión (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Físico + técnica"
                value={formTitulo}
                onChange={e => setFormTitulo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Objetivo */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Objetivo *
            </label>
            <textarea
              required
              rows={2}
              placeholder="Ej: Trabajar la presión tras pérdida y la salida de balón."
              value={formObjetivo}
              onChange={e => setFormObjetivo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
            />
          </div>

          {/* 5. Descripción */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Descripción (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Ej: Rondos de posesión, partido reducido 6x6 y finalización."
              value={formDescripcion}
              onChange={e => setFormDescripcion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
            />
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
              Guardar Sesión
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};