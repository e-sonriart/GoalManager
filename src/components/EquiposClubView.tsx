import React, { useState, useMemo } from 'react';
import { useClub } from '../context/ClubContext';
import { Equipo, Categoria, Entrenador, TipoFutbol, AnoEquipo, Jugador, PosicionJugador, Estadistica, HistorialEstadisticaTemporada } from '../types';
import { Modal } from './Modal';
import { TeamShield } from './TeamShield';
import { SHIELD_PRESETS } from '../utils/shieldPresets';
import { computeStandings, TeamStanding } from '../utils/standings';

type PosJugador = PosicionJugador;

const POS_ABBR: Record<PosJugador, string> = {
  Portero: 'POR',
  Defensa: 'DEF',
  Centrocampista: 'MED',
  Delantero: 'ATA'
};

const POS_ORDER: Record<PosJugador, number> = {
  Portero: 0,
  Defensa: 1,
  Centrocampista: 2,
  Delantero: 3
};

/** Mismos discos de color que la alineación (por posición). */
const POS_DISK: Record<PosJugador, string> = {
  Portero: 'bg-amber-400 text-amber-950 border-amber-200',
  Defensa: 'bg-emerald-500 text-white border-emerald-300',
  Centrocampista: 'bg-sky-500 text-white border-sky-300',
  Delantero: 'bg-rose-500 text-white border-rose-300'
};

function dorsalNum(d: number | string): number {
  const n = Number(d);
  return Number.isFinite(n) && n > 0 ? n : 999;
}

function sortSquadByPos(list: Jugador[]): Jugador[] {
  return [...list].sort((a, b) => {
    const pa = POS_ORDER[a.posicion] ?? 9;
    const pb = POS_ORDER[b.posicion] ?? 9;
    if (pa !== pb) return pa - pb;
    const da = dorsalNum(a.dorsal);
    const db = dorsalNum(b.dorsal);
    if (da !== db) return da - db;
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}

import {
  Shield,
  Layers,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Download,
  Phone,
  Users,
  Image,
  Sparkles,
  Link2,
  Clock,
  Timer,
  Trophy,
  BarChart3
} from 'lucide-react';

export const EquiposClubView: React.FC = () => {
  const {
    equipos,
    categorias,
    entrenadores,
    jugadores,
    estadisticas,
    partidos,
    clubConfig,
    saveEquipo,
    deleteEquipo,
    saveCategoria,
    deleteCategoria,
    saveEntrenador,
    deleteEntrenador,
    saveJugador,
    deleteJugador,
    saveEstadistica,
    exportSheet,
    currentUser
  } = useClub();

  const [activeSubTab, setActiveSubTab] = useState<'equipos' | 'categorias' | 'entrenadores'>('equipos');

  // Modales generales
  const [modalType, setModalType] = useState<'equipo' | 'categoria' | 'entrenador' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Estados para plantillas de equipo
  const [selectedEquipoForSquad, setSelectedEquipoForSquad] = useState<Equipo | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Jugador | null>(null);
  const [playerNombre, setPlayerNombre] = useState('');
  const [playerDorsal, setPlayerDorsal] = useState<number | string>('');
  const [playerPosicion, setPlayerPosicion] = useState<PosicionJugador>('Delantero');

  // Estados para estadísticas e histórico de jugador
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<Jugador | null>(null);
  const [statPartidos, setStatPartidos] = useState(0);
  const [statTitular, setStatTitular] = useState(0);
  const [statGoles, setStatGoles] = useState(0);
  const [statAsistencias, setStatAsistencias] = useState(0);
  const [statAmarillas, setStatAmarillas] = useState(0);
  const [statRojas, setStatRojas] = useState(0);
  const [statTemporada, setStatTemporada] = useState(clubConfig.temporada || '2025/2026');
  const [statHistorico, setStatHistorico] = useState<HistorialEstadisticaTemporada[]>([]);

  // Formulario histórico
  const [histTemp, setHistTemp] = useState('');
  const [histEquipo, setHistEquipo] = useState('');
  const [histPartidos, setHistPartidos] = useState(0);
  const [histTitular, setHistTitular] = useState(0);
  const [histGoles, setHistGoles] = useState(0);
  const [histAsistencias, setHistAsistencias] = useState(0);
  const [histAmarillas, setHistAmarillas] = useState(0);
  const [histRojas, setHistRojas] = useState(0);

  /** Resumen de partidos de la temporada del equipo abierto (J/G/E/P) */
  const teamSeasonRow = useMemo<TeamStanding | null>(() => {
    if (!selectedEquipoForSquad) return null;
    const nombre = selectedEquipoForSquad.nombre.trim().toLowerCase();
    for (const { rows } of computeStandings(partidos)) {
      const hit = rows.find(r => r.equipo.trim().toLowerCase() === nombre);
      if (hit) return hit;
    }
    return null;
  }, [partidos, selectedEquipoForSquad]);

  const squadPlayers = useMemo(
    () => selectedEquipoForSquad
      ? sortSquadByPos(jugadores.filter(j => j.equipo === selectedEquipoForSquad.nombre))
      : [],
    [jugadores, selectedEquipoForSquad]
  );

  const openPlayerModal = (player?: Jugador) => {
    if (player) {
      setEditingPlayer(player);
      setPlayerNombre(player.nombre);
      setPlayerDorsal(player.dorsal);
      setPlayerPosicion(player.posicion);
    } else {
      setEditingPlayer(null);
      setPlayerNombre('');
      setPlayerDorsal('');
      setPlayerPosicion('Delantero');
    }
    setIsPlayerModalOpen(true);
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerNombre.trim() || !selectedEquipoForSquad) return;
    await saveJugador({
      id: editingPlayer?.id,
      nombre: playerNombre.trim(),
      dorsal: playerDorsal !== '' ? Number(playerDorsal) : '',
      posicion: playerPosicion,
      categoria: selectedEquipoForSquad.categoria,
      equipo: selectedEquipoForSquad.nombre,
      temporada: clubConfig.temporada || '2025/2026',
      fechaAlta: editingPlayer?.fechaAlta || new Date().toISOString().split('T')[0]
    });
    setIsPlayerModalOpen(false);
  };

  const openPlayerStatsModal = (player: Jugador) => {
    setSelectedPlayerForStats(player);
    // Cerrar plantilla para evitar modales apilados (bloqueaban el scroll)
    setSelectedEquipoForSquad(null);
    const est = estadisticas.find(s => s.jugadorId === player.id);
    setStatPartidos(est?.partidosJugados || 0);
    setStatTitular(est?.titular || 0);
    setStatGoles(est?.goles || 0);
    setStatAsistencias(est?.asistencias || 0);
    setStatAmarillas(est?.tarjetasAmarillas || est?.tarjetas || 0);
    setStatRojas(est?.tarjetasRojas || 0);
    setStatTemporada(est?.temporada || player.temporada || clubConfig.temporada || '2025/2026');
    setStatHistorico(est?.historico || []);
  };

  const handleSavePlayerStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerForStats) return;
    await saveEstadistica({
      jugadorId: selectedPlayerForStats.id,
      temporada: statTemporada,
      partidosJugados: Number(statPartidos),
      titular: Number(statTitular),
      goles: Number(statGoles),
      asistencias: Number(statAsistencias),
      tarjetasAmarillas: Number(statAmarillas),
      tarjetasRojas: Number(statRojas),
      tarjetas: Number(statAmarillas) + Number(statRojas),
      historico: statHistorico
    });
    setSelectedPlayerForStats(null);
  };

  const handleAddHistorial = () => {
    if (!histTemp.trim()) return;
    const nuevoRegistro: HistorialEstadisticaTemporada = {
      temporada: histTemp.trim(),
      equipo: histEquipo.trim() || selectedEquipoForSquad?.nombre || '',
      partidosJugados: Number(histPartidos),
      titular: Number(histTitular),
      goles: Number(histGoles),
      asistencias: Number(histAsistencias),
      tarjetasAmarillas: Number(histAmarillas),
      tarjetasRojas: Number(histRojas)
    };
    setStatHistorico([...statHistorico, nuevoRegistro]);
    setHistTemp('');
    setHistEquipo('');
    setHistPartidos(0);
    setHistTitular(0);
    setHistGoles(0);
    setHistAsistencias(0);
    setHistAmarillas(0);
    setHistRojas(0);
  };

  const handleRemoveHistorial = (index: number) => {
    setStatHistorico(statHistorico.filter((_, i) => i !== index));
  };

  // Estados formulario Equipo (Categoría + Letra + F7 Año)
  const [eqCategoria, setEqCategoria] = useState('');
  const [eqLetra, setEqLetra] = useState('A');
  const [eqAno, setEqAno] = useState<AnoEquipo | ''>('');
  const [eqEntrenadores, setEqEntrenadores] = useState<string[]>([]);
  const [eqEscudo, setEqEscudo] = useState('');

  // Estados formulario Categoría
  const [catNombre, setCatNombre] = useState('');
  const [catTipo, setCatTipo] = useState<TipoFutbol>('F11');
  const [catTiempojuego, setCatTiempojuego] = useState<number>(45);

  // Estados formulario Entrenador
  const [entNombre, setEntNombre] = useState('');
  const [entTelefono, setEntTelefono] = useState('');

  // Comprobar si la categoría seleccionada es de F8
  const currentCategoryObj = categorias.find(c => c.nombre === eqCategoria);
  const isF8 = currentCategoryObj?.tipo === 'F8' ||
    eqCategoria.toLowerCase().includes('f8') ||
    eqCategoria.toLowerCase().includes('alev') ||
    eqCategoria.toLowerCase().includes('benj') ||
    eqCategoria.toLowerCase().includes('preb') ||
    eqCategoria.toLowerCase().includes('chupet');

  const computedEqNombre = `${eqCategoria || 'Categoría'} ${eqLetra || 'A'}`.trim();

  // Abrir modal Equipo
  const openEquipoModal = (equipo?: Equipo) => {
    if (equipo) {
      setEditingItem(equipo);
      const cat = equipo.categoria || categorias[0]?.nombre || 'Senior';
      const words = equipo.nombre.trim().split(' ');
      const lastWord = words[words.length - 1];
      const derivedLetra = equipo.letra || (lastWord.length <= 2 ? lastWord : 'A');
      setEqCategoria(cat);
      setEqLetra(derivedLetra);
      setEqAno(equipo.ano || '');
      const listEnt = equipo.entrenadores || (equipo.entrenador ? equipo.entrenador.split(',').map(s => s.trim()).filter(Boolean) : [entrenadores[0]?.nombre || '']);
      setEqEntrenadores(listEnt);
      setEqEscudo(equipo.escudo || '');
    } else {
      setEditingItem(null);
      const defaultCat = categorias[0]?.nombre || 'Senior';
      setEqCategoria(defaultCat);
      setEqLetra('A');
      setEqAno('');
      setEqEntrenadores([entrenadores[0]?.nombre || '']);
      setEqEscudo('');
    }
    setModalType('equipo');
  };

  // Abrir modal Categoría
  const openCategoriaModal = (cat?: Categoria) => {
    if (cat) {
      setEditingItem(cat);
      setCatNombre(cat.nombre);
      const defaultTipo: TipoFutbol = cat.tipo || (
        cat.nombre.toLowerCase().includes('f8') ||
        cat.nombre.toLowerCase().includes('alev') ||
        cat.nombre.toLowerCase().includes('benj') ||
        cat.nombre.toLowerCase().includes('preb')
          ? 'F8'
          : 'F11'
      );
      setCatTipo(defaultTipo);
      const defaultMins = defaultTipo === 'F8' ? 25 : 45;
      setCatTiempojuego(Number(cat.tiempojuego || cat.tiempoJuego) || defaultMins);
    } else {
      setEditingItem(null);
      setCatNombre('');
      setCatTipo('F11');
      setCatTiempojuego(45);
    }
    setModalType('categoria');
  };

  // Abrir modal Entrenador
  const openEntrenadorModal = (ent?: Entrenador) => {
    if (ent) {
      setEditingItem(ent);
      setEntNombre(ent.nombre);
      setEntTelefono(ent.telefono);
    } else {
      setEditingItem(null);
      setEntNombre('');
      setEntTelefono('');
    }
    setModalType('entrenador');
  };

  const handleSaveEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNombre = `${eqCategoria.trim()} ${eqLetra.trim()}`.trim();
    if (!finalNombre) return;
    const cleanEntrenadores = eqEntrenadores.filter(Boolean);
    await saveEquipo({
      id: editingItem?.id,
      nombre: finalNombre,
      categoria: eqCategoria || (categorias[0]?.nombre ?? 'Senior'),
      letra: eqLetra.trim().toUpperCase() || 'A',
      ano: (isF8 && eqAno) ? (eqAno as AnoEquipo) : undefined,
      entrenadores: cleanEntrenadores,
      entrenador: cleanEntrenadores.join(', '),
      escudo: eqEscudo.trim() || undefined
    });
    setModalType(null);
  };

  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNombre.trim()) return;
    await saveCategoria({
      id: editingItem?.id,
      nombre: catNombre.trim(),
      tipo: catTipo,
      tiempojuego: Number(catTiempojuego) || (catTipo === 'F8' ? 25 : 45)
    });
    setModalType(null);
  };

  const handleSaveEntrenador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entNombre.trim()) return;
    await saveEntrenador({
      id: editingItem?.id,
      nombre: entNombre.trim(),
      telefono: entTelefono.trim()
    });
    setModalType(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-athletic tracking-tight">
            ESTRUCTURA DEL <span className="text-orange-600">CLUB</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Organización de equipos federados, categorías y cuerpo técnico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSheet(activeSubTab)}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Exportar {activeSubTab}
          </button>
          {activeSubTab === 'equipos' && (
            <button
              onClick={() => openEquipoModal()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nuevo Equipo
            </button>
          )}
          {activeSubTab === 'categorias' && (
            <button
              onClick={() => openCategoriaModal()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nueva Categoría
            </button>
          )}
          {activeSubTab === 'entrenadores' && (
            <button
              onClick={() => openEntrenadorModal()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nuevo Entrenador
            </button>
          )}
        </div>
      </div>

      {/* Subtabs Selector */}
      <div className="flex border-b border-gray-200 space-x-2">
        <button
          onClick={() => setActiveSubTab('equipos')}
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'equipos'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          Equipos ({equipos.length})
        </button>
        <button
          onClick={() => setActiveSubTab('categorias')}
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'categorias'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Categorías ({categorias.length})
        </button>
        <button
          onClick={() => setActiveSubTab('entrenadores')}
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'entrenadores'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Entrenadores ({entrenadores.length})
        </button>
      </div>

      {/* 1. TAB EQUIPOS */}
      {activeSubTab === 'equipos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...equipos].sort((a, b) => {
            if (currentUser?.equipo) {
              if (a.nombre === currentUser.equipo) return -1;
              if (b.nombre === currentUser.equipo) return 1;
            }
            return 0;
          }).map(eq => {
            const numJugadores = jugadores.filter(j => j.equipo === eq.nombre).length;
            const shieldUrl = eq.escudo || clubConfig.escudo;
            const isUserTeam = currentUser?.equipo === eq.nombre;
            return (
              <div
                key={eq.id}
                className={`bg-white p-4 sm:p-5 rounded-2xl border ${isUserTeam ? 'border-orange-500 shadow-md ring-1 ring-orange-500/20' : 'border-gray-150 shadow-sm hover:border-orange-200'} transition-all flex flex-col justify-between space-y-4 min-w-0 overflow-hidden`}
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-xs p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        <TeamShield
                          escudoUrl={shieldUrl}
                          teamName={eq.nombre}
                          size="lg"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900 font-athletic truncate" title={eq.nombre}>
                            {eq.nombre}
                          </h3>
                          {isUserTeam && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full shrink-0">
                              Tu Acceso
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEquipoModal(eq)}
                        title="Editar equipo y escudo"
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 shrink-0" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar equipo ${eq.nombre}?`)) deleteEquipo(eq.id);
                        }}
                        title="Eliminar equipo"
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-600 min-w-0">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-gray-400 shrink-0">Entrenador(es):</span>
                    <span className="font-semibold text-gray-800 truncate text-right">{eq.entrenadores ? eq.entrenadores.join(', ') : eq.entrenador}</span>
                  </div>
                  <button
                    onClick={() => setSelectedEquipoForSquad(eq)}
                    className="w-full mt-2 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-xl border border-orange-200 transition-colors flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Users className="w-4 h-4 text-orange-600" />
                    Ver Plantilla ({numJugadores})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. TAB CATEGORÍAS */}
      {activeSubTab === 'categorias' && (
        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900 text-white font-athletic uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Modalidad</th>
                <th className="py-3 px-4">Tiempo de Juego</th>
                <th className="py-3 px-4">Equipos Vinculados</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categorias.map(cat => {
                const countEquipos = equipos.filter(e => e.categoria === cat.nombre).length;
                const minutosParte = Number(cat.tiempojuego || cat.tiempoJuego) || (cat.tipo === 'F8' ? 25 : 45);
                const esF8 = cat.tipo === 'F8';

                return (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900 text-sm">{cat.nombre}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                          esF8
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        ⚽ {cat.tipo || 'F11'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-bold text-[11px]">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {minutosParte}&apos;
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <span className="px-2.5 py-0.5 bg-orange-50 text-orange-700 font-bold rounded-md border border-orange-100 text-[11px]">
                        {countEquipos} {countEquipos === 1 ? 'equipo' : 'equipos'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openCategoriaModal(cat)}
                          title="Editar categoría"
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4 shrink-0" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar categoría ${cat.nombre}?`)) deleteCategoria(cat.id);
                          }}
                          title="Eliminar categoría"
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
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

      {/* 3. TAB ENTRENADORES */}
      {activeSubTab === 'entrenadores' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entrenadores.map(ent => {
            const equiposAsignados = equipos.filter(e => e.entrenador === ent.nombre);
            return (
              <div
                key={ent.id}
                className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm hover:border-orange-200 transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center font-athletic">
                      {ent.nombre.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{ent.nombre}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-orange-500" />
                        {ent.telefono || 'Sin teléfono'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEntrenadorModal(ent)}
                      className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
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
                </div>

                <div className="pt-2 border-t border-gray-100 text-xs">
                  <span className="text-gray-400 block mb-1">Equipos a cargo:</span>
                  {equiposAsignados.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {equiposAsignados.map(e => (
                        <span key={e.id} className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded font-semibold text-[10px]">
                          {e.nombre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Sin asignación activa</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Equipo */}
      <Modal
        isOpen={modalType === 'equipo'}
        onClose={() => setModalType(null)}
        title={editingItem ? 'Editar Equipo' : 'Nuevo Equipo'}
        subtitle="Selecciona categoría y letra asignada al equipo del club"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveEquipo} className="space-y-4">
          {/* Vista previa de cómo quedará el equipo: Escudo del club + Nombre (Categoría + Letra) */}
          <div className="bg-orange-50/80 p-3.5 rounded-2xl border border-orange-200/80 flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white border border-orange-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <TeamShield
                escudoUrl={eqEscudo || clubConfig.escudo}
                teamName={computedEqNombre}
                size="lg"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-orange-700">
                Vista previa del equipo del club
              </div>
              <h4 className="text-base font-black font-athletic text-gray-900 truncate">
                {computedEqNombre}
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="px-2 py-0.5 rounded-md bg-white text-orange-700 font-semibold text-[10px] border border-orange-200">
                  {eqCategoria || 'Categoría'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white text-gray-700 font-bold text-[10px] border border-gray-200">
                  Letra {eqLetra}
                </span>
                {isF8 && eqAno && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                    {eqAno}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Categoría */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                1. Categoría *
              </label>
              <select
                value={eqCategoria}
                onChange={e => setEqCategoria(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {categorias.map(c => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre} {c.tipo ? `(${c.tipo})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Letra Asignada */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                2. Letra Asignada *
              </label>
              <div className="flex items-center gap-1">
                {['A', 'B', 'C', 'D', 'E'].map(letra => (
                  <button
                    key={letra}
                    type="button"
                    onClick={() => setEqLetra(letra)}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all border ${
                      eqLetra === letra
                        ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {letra}
                  </button>
                ))}
                <input
                  type="text"
                  maxLength={3}
                  placeholder="Otra"
                  value={['A', 'B', 'C', 'D', 'E'].includes(eqLetra) ? '' : eqLetra}
                  onChange={e => setEqLetra(e.target.value.toUpperCase())}
                  className="w-14 py-1.5 px-2 text-center text-xs font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Opción de Año para F8 (1er año o 2do año) */}
          {isF8 && (
            <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-200/80">
              <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5">
                Modalidad F8: Año del Equipo
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEqAno('')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                    !eqAno
                      ? 'bg-white border-blue-500 text-blue-900 shadow-xs font-bold ring-2 ring-blue-300'
                      : 'bg-blue-50/50 border-blue-200 text-blue-700 hover:bg-white'
                  }`}
                >
                  Sin especificar
                </button>
                <button
                  type="button"
                  onClick={() => setEqAno('1er año')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                    eqAno === '1er año'
                      ? 'bg-blue-600 border-blue-700 text-white shadow-xs font-bold ring-2 ring-blue-300'
                      : 'bg-white border-blue-200 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  1er año
                </button>
                <button
                  type="button"
                  onClick={() => setEqAno('2do año')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                    eqAno === '2do año'
                      ? 'bg-blue-600 border-blue-700 text-white shadow-xs font-bold ring-2 ring-blue-300'
                      : 'bg-white border-blue-200 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  2do año
                </button>
              </div>
              <p className="text-[11px] text-blue-600 mt-1.5">
                Asigna si es generación de primer año o segundo año para optimizar convocatorias y rendimiento.
              </p>
            </div>
          )}

          {/* Entrenador(es) Responsables */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Entrenador(es) Responsables (Selecciona uno o varios)
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto p-2.5 bg-gray-50 border border-gray-300 rounded-xl">
              {entrenadores.map(ent => {
                const isChecked = eqEntrenadores.includes(ent.nombre);
                return (
                  <label key={ent.id} className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer hover:bg-white p-1 rounded">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => {
                        if (e.target.checked) {
                          setEqEntrenadores([...eqEntrenadores, ent.nombre]);
                        } else {
                          setEqEntrenadores(eqEntrenadores.filter(n => n !== ent.nombre));
                        }
                      }}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span>{ent.nombre}</span>
                    {ent.telefono && <span className="text-gray-400 text-[10px] ml-auto">({ent.telefono})</span>}
                  </label>
                );
              })}
              {entrenadores.length === 0 && (
                <span className="text-xs text-gray-400 italic">No hay entrenadores registrados.</span>
              )}
            </div>
          </div>

          {/* Campo Escudo personalizado (opcional) */}
          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-orange-600" />
                Escudo del Equipo (Por defecto usa el escudo oficial del club)
              </span>
              {eqEscudo && (
                <button
                  type="button"
                  onClick={() => setEqEscudo('')}
                  className="text-[10px] text-gray-400 hover:text-red-600 lowercase"
                >
                  Usar del club
                </button>
              )}
            </label>

            <div className="flex gap-2 items-center">
              <input
                type="url"
                placeholder="URL de escudo personalizado (opcional)"
                value={eqEscudo}
                onChange={e => setEqEscudo(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-150">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-orange-500/20"
            >
              Guardar Equipo
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Categoría */}
      <Modal
        isOpen={modalType === 'categoria'}
        onClose={() => setModalType(null)}
        title={editingItem ? 'Editar Categoría' : 'Nueva Categoría'}
        subtitle="Configuración reglamentaria: modalidad federativa y tiempo de juego"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveCategoria} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Nombre de la Categoría *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Cadete Regional, Alevín A..."
              value={catNombre}
              onChange={e => setCatNombre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Modalidad F8 o F11 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Modalidad de Fútbol (Tipo) *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCatTipo('F8');
                  if (catTiempojuego === 45 || !catTiempojuego) setCatTiempojuego(25);
                }}
                className={`p-3 rounded-xl border text-center transition-all ${
                  catTipo === 'F8'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400 text-amber-900 shadow-xs'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-athletic font-bold text-base text-amber-700">F8</div>
                <span className="text-[11px] uppercase font-bold text-amber-800">Fútbol 8</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCatTipo('F11');
                  if (catTiempojuego === 25 || !catTiempojuego) setCatTiempojuego(45);
                }}
                className={`p-3 rounded-xl border text-center transition-all ${
                  catTipo === 'F11'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400 text-blue-900 shadow-xs'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-athletic font-bold text-base text-blue-700">F11</div>
                <span className="text-[11px] uppercase font-bold text-blue-800">Fútbol 11</span>
              </button>
            </div>
          </div>

          {/* Tiempo de Juego (Minutos de cada parte) */}
          <div className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-100 space-y-2">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                Minutos de cada parte *
              </span>
            </label>

            <div className="flex items-center gap-3">
              <div className="w-28">
                <input
                  type="number"
                  min="10"
                  max="60"
                  required
                  value={catTiempojuego || ''}
                  onChange={e => setCatTiempojuego(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-center text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <span className="text-xs text-gray-600 font-medium">minutos</span>
            </div>

            {/* Presets rápidos según reglamentos federativos */}
            <div className="pt-1.5 border-t border-orange-200/50">
              <div className="text-[10px] font-semibold text-gray-500 mb-1">Duraciones habituales:</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '25 min (Benjamín)', val: 25 },
                  { label: '30 min (Alevín)', val: 30 },
                  { label: '35 min (Infantil)', val: 35 },
                  { label: '40 min (Cadete)', val: 40 },
                  { label: '45 min (Juvenil/Senior)', val: 45 }
                ].map(preset => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setCatTiempojuego(preset.val)}
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition-all ${
                      catTiempojuego === preset.val
                        ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-150">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-orange-500/20"
            >
              Guardar Categoría
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Entrenador */}
      <Modal
        isOpen={modalType === 'entrenador'}
        onClose={() => setModalType(null)}
        title={editingItem ? 'Editar Entrenador' : 'Nuevo Entrenador'}
        subtitle="Ficha de contacto del cuerpo técnico"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEntrenador} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Nombre y Apellidos *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Roberto Benítez"
              value={entNombre}
              onChange={e => setEntNombre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Teléfono de Contacto
            </label>
            <input
              type="tel"
              placeholder="+34 612 345 678"
              value={entTelefono}
              onChange={e => setEntTelefono(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-150">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-orange-500/20"
            >
              Guardar Entrenador
            </button>
          </div>
        </form>
      </Modal>

      {/* 1. Modal de Plantilla del Equipo */}
      {selectedEquipoForSquad && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEquipoForSquad(null)}
          title={`Plantilla: ${selectedEquipoForSquad.nombre}`}
          subtitle={`Categoría: ${selectedEquipoForSquad.categoria} • Temporada: ${selectedEquipoForSquad.temporada || clubConfig.temporada || '2025/2026'}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            {/* 1º: datos de partidos de esta temporada */}
            <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white rounded-2xl p-4 sm:p-5 border border-gray-800 shadow-lg min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-orange-400 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-300">
                  Partidos de esta temporada
                </h4>
                <span className="text-[10px] text-gray-400 ml-auto shrink-0">
                  {clubConfig.temporada || selectedEquipoForSquad.temporada || '2025/2026'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {[
                  { label: 'Jugados', value: teamSeasonRow?.jugados ?? 0, accent: 'text-white' },
                  { label: 'Ganados', value: teamSeasonRow?.ganados ?? 0, accent: 'text-emerald-400' },
                  { label: 'Empatados', value: teamSeasonRow?.empatados ?? 0, accent: 'text-amber-400' },
                  { label: 'Perdidos', value: teamSeasonRow?.perdidos ?? 0, accent: 'text-red-400' }
                ].map(cell => (
                  <div
                    key={cell.label}
                    className="bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-center min-w-0"
                  >
                    <div className={`text-xl sm:text-2xl font-black font-athletic tabular-nums ${cell.accent}`}>
                      {cell.value}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mt-0.5">
                      {cell.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/10 text-[11px] text-gray-300">
                <span>GF <strong className="text-white">{teamSeasonRow?.gf ?? 0}</strong></span>
                <span>GC <strong className="text-white">{teamSeasonRow?.gc ?? 0}</strong></span>
                <span>DG <strong className="text-white">
                  {(teamSeasonRow?.dif ?? 0) > 0 ? '+' : ''}{teamSeasonRow?.dif ?? 0}
                </strong></span>
                <span>Pts <strong className="text-orange-400">{teamSeasonRow?.puntos ?? 0}</strong></span>
                {!teamSeasonRow && (
                  <span className="text-gray-500 italic">Sin partidos finalizados aún</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Jugadores en plantilla ({squadPlayers.length})
              </span>
              <button
                onClick={() => openPlayerModal()}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir Jugador
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto scroll-x">
                <table className="w-full min-w-[420px] text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Dorsal</th>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Pos.</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {squadPlayers.map(player => (
                      <tr key={player.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <span
                            className={`w-8 h-8 rounded-full inline-flex items-center justify-center font-black font-athletic text-sm border-2 ${POS_DISK[player.posicion]}`}
                            title={player.posicion}
                          >
                            {player.dorsal || '–'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{player.nombre}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-bold text-[11px] tracking-wide">
                            {POS_ABBR[player.posicion] || player.posicion.slice(0, 3).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => openPlayerStatsModal(player)}
                            className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Estadísticas e histórico"
                          >
                            <Trophy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openPlayerModal(player)}
                            className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Editar jugador"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar al jugador ${player.nombre}?`)) deleteJugador(player.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Eliminar jugador"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {squadPlayers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                          No hay jugadores registrados en este equipo todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Modal de Añadir / Editar Jugador */}
      {isPlayerModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsPlayerModalOpen(false)}
          title={editingPlayer ? 'Editar Jugador' : `Añadir Jugador a ${selectedEquipoForSquad?.nombre}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSavePlayer} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Nombre del Jugador *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Alejandro Gómez"
                value={playerNombre}
                onChange={e => setPlayerNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Dorsal
                </label>
                <input
                  type="number"
                  placeholder="Ej: 10"
                  value={playerDorsal}
                  onChange={e => setPlayerDorsal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Posición *
                </label>
                <select
                  value={playerPosicion}
                  onChange={e => setPlayerPosicion(e.target.value as PosicionJugador)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                >
                  <option value="Portero">Portero</option>
                  <option value="Defensa">Defensa</option>
                  <option value="Centrocampista">Centrocampista</option>
                  <option value="Delantero">Delantero</option>
                </select>
              </div>
            </div>



            <div className="flex justify-end gap-2 pt-4 border-t border-gray-150">
              <button
                type="button"
                onClick={() => setIsPlayerModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-orange-500/20"
              >
                Guardar Jugador
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. Modal de Estadísticas Detalladas e Histórico */}
      {selectedPlayerForStats && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPlayerForStats(null)}
          title={`Estadísticas & Histórico: ${selectedPlayerForStats.nombre}`}
          subtitle={`Dorsal: #${selectedPlayerForStats.dorsal || '-'} • Posición: ${selectedPlayerForStats.posicion} • Equipo: ${selectedPlayerForStats.equipo}`}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSavePlayerStats} className="space-y-6 min-w-0">
            <div className="bg-orange-50/50 p-3 sm:p-4 rounded-2xl border border-orange-100 space-y-4 min-w-0">
              <h4 className="text-xs font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-orange-600 shrink-0" />
                Estadísticas de la Temporada Actual
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 min-w-0">
                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Partidos Jugados</label>
                  <input
                    type="number"
                    min="0"
                    value={statPartidos}
                    onChange={e => setStatPartidos(Number(e.target.value))}
                    className="w-full min-w-0 px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Titular</label>
                  <input
                    type="number"
                    min="0"
                    value={statTitular}
                    onChange={e => setStatTitular(Number(e.target.value))}
                    className="w-full min-w-0 px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Goles</label>
                  <input
                    type="number"
                    min="0"
                    value={statGoles}
                    onChange={e => setStatGoles(Number(e.target.value))}
                    className="w-full min-w-0 px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Asistencias</label>
                  <input
                    type="number"
                    min="0"
                    value={statAsistencias}
                    onChange={e => setStatAsistencias(Number(e.target.value))}
                    className="w-full min-w-0 px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-2 border-t border-orange-200/60 min-w-0">
                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-yellow-700 mb-1">Tarjetas Amarillas</label>
                  <input
                    type="number"
                    min="0"
                    value={statAmarillas}
                    onChange={e => setStatAmarillas(Number(e.target.value))}
                    className="w-full min-w-0 px-2 sm:px-3 py-2 bg-white border border-yellow-300 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-red-700 mb-1">Tarjetas Rojas</label>
                  <input
                    type="number"
                    min="0"
                    value={statRojas}
                    onChange={e => setStatRojas(Number(e.target.value))}
                    className="w-full min-w-0 px-2 sm:px-3 py-2 bg-white border border-red-300 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Temporada</label>
                  <input
                    type="text"
                    value={statTemporada}
                    onChange={e => setStatTemporada(e.target.value)}
                    className="w-full min-w-0 px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Zona Histórica */}
            <div className="space-y-3 min-w-0">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-600 shrink-0" />
                Zona Histórica (Otras Temporadas)
              </h4>

              <div className="bg-gray-50 p-3 sm:p-3.5 rounded-2xl border border-gray-200 space-y-3 min-w-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0">
                  <input
                    type="text"
                    placeholder="Temporada (ej: 23/24)"
                    value={histTemp}
                    onChange={e => setHistTemp(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs min-w-0 w-full"
                  />
                  <input
                    type="text"
                    placeholder="Equipo"
                    value={histEquipo}
                    onChange={e => setHistEquipo(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs min-w-0 w-full"
                  />
                  <input
                    type="number"
                    placeholder="Partidos"
                    value={histPartidos || ''}
                    onChange={e => setHistPartidos(Number(e.target.value))}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs min-w-0 w-full"
                  />
                  <input
                    type="number"
                    placeholder="Goles"
                    value={histGoles || ''}
                    onChange={e => setHistGoles(Number(e.target.value))}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs min-w-0 w-full"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                    <span>Titular: <input type="number" value={histTitular || ''} onChange={e => setHistTitular(Number(e.target.value))} className="w-12 px-1 py-0.5 border rounded ml-1 text-center" /></span>
                    <span>Asist.: <input type="number" value={histAsistencias || ''} onChange={e => setHistAsistencias(Number(e.target.value))} className="w-12 px-1 py-0.5 border rounded ml-1 text-center" /></span>
                    <span>Amarillas: <input type="number" value={histAmarillas || ''} onChange={e => setHistAmarillas(Number(e.target.value))} className="w-12 px-1 py-0.5 border rounded ml-1 text-center" /></span>
                    <span>Rojas: <input type="number" value={histRojas || ''} onChange={e => setHistRojas(Number(e.target.value))} className="w-12 px-1 py-0.5 border rounded ml-1 text-center" /></span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddHistorial}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                  >
                    + Añadir Temporada
                  </button>
                </div>
              </div>

              {statHistorico.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase">
                      <tr>
                        <th className="px-3 py-2">Temporada</th>
                        <th className="px-3 py-2">Equipo</th>
                        <th className="px-3 py-2 text-center">Partidos</th>
                        <th className="px-3 py-2 text-center">Goles</th>
                        <th className="px-3 py-2 text-center">Asist.</th>
                        <th className="px-3 py-2 text-center">A/R</th>
                        <th className="px-3 py-2 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {statHistorico.map((h, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-bold text-gray-900">{h.temporada}</td>
                          <td className="px-3 py-2 text-gray-600">{h.equipo}</td>
                          <td className="px-3 py-2 text-center font-semibold">{h.partidosJugados}</td>
                          <td className="px-3 py-2 text-center font-bold text-orange-600">{h.goles}</td>
                          <td className="px-3 py-2 text-center">{h.asistencias}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-yellow-600 font-bold">{h.tarjetasAmarillas}</span> / <span className="text-red-600 font-bold">{h.tarjetasRojas}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveHistorial(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Eliminar registro histórico"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic text-center py-2">No hay registros históricos añadidos aún.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-150 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedPlayerForStats(null)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-orange-500/20"
              >
                Guardar Estadísticas
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
