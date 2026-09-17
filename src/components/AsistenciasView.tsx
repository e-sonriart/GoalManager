import React, { useState, useMemo } from 'react';
import { useClub } from '../context/ClubContext';
import { EstadoAsistencia } from '../types';
import { TeamShield } from './TeamShield';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Calendar,
  Download,
  Filter,
  Users,
  Activity
} from 'lucide-react';

export const AsistenciasView: React.FC = () => {
  const {
    jugadores,
    asistencias,
    equipos,
    categorias,
    toggleAsistencia,
    batchMarkAsistencia,
    exportSheet,
    currentUser,
    getTeamEscudo
  } = useClub();

  const [selectedFecha, setSelectedFecha] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedEquipo, setSelectedEquipo] = useState<string>(
    currentUser?.equipo && (currentUser.rol === 'entrenador' || currentUser.rol === 'jugador')
      ? currentUser.equipo
      : ''
  );
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');

  // Filtrar jugadores por equipo y categoría
  const filteredJugadores = useMemo(() => {
    return jugadores.filter(j => {
      const matchEquipo = !selectedEquipo || j.equipo === selectedEquipo;
      const matchCat = !selectedCategoria || j.categoria === selectedCategoria;
      return matchEquipo && matchCat;
    });
  }, [jugadores, selectedEquipo, selectedCategoria]);

  // Mapa de asistencias para la fecha seleccionada
  const asistenciasMap = useMemo(() => {
    const map = new Map<string, EstadoAsistencia>();
    asistencias
      .filter(a => a.fecha === selectedFecha)
      .forEach(a => {
        map.set(a.jugadorId, a.estado);
      });
    return map;
  }, [asistencias, selectedFecha]);

  // Contadores del día
  const totalAsisten = filteredJugadores.filter(
    j => asistenciasMap.get(j.id) === 'asiste'
  ).length;

  const totalNoAsisten = filteredJugadores.filter(
    j => asistenciasMap.get(j.id) === 'no asiste'
  ).length;

  const porcentajeDia = filteredJugadores.length > 0
    ? Math.round((totalAsisten / filteredJugadores.length) * 100)
    : 0;

  const handleMarcarTodos = async (estado: EstadoAsistencia) => {
    const ids = filteredJugadores.map(j => j.id);
    await batchMarkAsistencia(selectedFecha, ids, estado);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-athletic tracking-tight">
            CONTROL DE <span className="text-orange-600">ASISTENCIAS</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Registro diario de asistencia a sesiones de entrenamiento y partidos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSheet('asistencias')}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Exportar Asistencias
          </button>
        </div>
      </div>

      {/* Date & Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Fecha de la Sesión:
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedFecha}
                onChange={e => setSelectedFecha(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Equipo Filter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Filtrar por Equipo:
              </label>
              {currentUser?.equipo && (currentUser.rol === 'entrenador' || currentUser.rol === 'jugador') && (
                <button
                  type="button"
                  onClick={() => setSelectedEquipo(currentUser.equipo || '')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 ${
                    selectedEquipo === currentUser.equipo
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                  }`}
                >
                  <span>⚽ Mi Equipo</span>
                </button>
              )}
            </div>
            <select
              value={selectedEquipo}
              onChange={e => setSelectedEquipo(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="">Todos los Equipos</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.nombre}>
                  {eq.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Categoria Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Filtrar por Categoría:
            </label>
            <select
              value={selectedCategoria}
              onChange={e => setSelectedCategoria(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
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

        {/* Quick Batch Actions & Metrics Banner */}
        <div className="pt-3 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {totalAsisten} Asisten
            </span>
            <span className="flex items-center gap-1.5 font-bold text-red-600">
              <XCircle className="w-4 h-4 text-red-500" /> {totalNoAsisten} No asisten
            </span>
            <span className="text-gray-400">•</span>
            <span className="font-bold text-gray-700 font-athletic text-sm">
              {porcentajeDia}% de presencia
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMarcarTodos('asiste')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
            >
              Marcar Todos Asisten
            </button>
            <button
              onClick={() => handleMarcarTodos('no asiste')}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors"
            >
              Marcar Todos No Asisten
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Players for Attendance */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-150 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">
            Plantilla seleccionada ({filteredJugadores.length} jugadores)
          </h3>
          <span className="text-xs text-gray-500">Fecha: {selectedFecha}</span>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredJugadores.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold">No hay jugadores con los filtros seleccionados.</p>
            </div>
          ) : (
            filteredJugadores.map(jugador => {
              const estado = asistenciasMap.get(jugador.id);

              // Calcular historial del jugador
              const jugAsistencias = asistencias.filter(a => a.jugadorId === jugador.id);
              const jugPresente = jugAsistencias.filter(a => a.estado === 'asiste').length;
              const ratioHistorial = jugAsistencias.length > 0
                ? Math.round((jugPresente / jugAsistencias.length) * 100)
                : 100;

              return (
                <div
                  key={jugador.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-orange-50/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-gray-900 text-white font-bold font-athletic text-xs flex items-center justify-center">
                      #{jugador.dorsal || '-'}
                    </span>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{jugador.nombre}</h4>
                      <div className="text-xs text-gray-400 flex items-center gap-1.5">
                        <TeamShield
                          escudoUrl={getTeamEscudo(jugador.equipo)}
                          teamName={jugador.equipo}
                          size="xs"
                          className="w-3.5 h-3.5"
                        />
                        <span>{jugador.posicion} • {jugador.equipo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right text-xs">
                      <span className="text-gray-400 text-[10px] block">Media General</span>
                      <span className="font-bold text-gray-800 font-athletic">{ratioHistorial}%</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleAsistencia(jugador.id, selectedFecha, 'asiste')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          estado === 'asiste'
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                            : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Asiste
                      </button>

                      <button
                        onClick={() => toggleAsistencia(jugador.id, selectedFecha, 'no asiste')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          estado === 'no asiste'
                            ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                            : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        No Asiste
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
