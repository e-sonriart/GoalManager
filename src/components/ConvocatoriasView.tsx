import React, { useState, useMemo } from 'react';
import { useClub } from '../context/ClubContext';
import { EstadoConvocatoria } from '../types';
import { TeamShield } from './TeamShield';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  Calendar,
  Shield,
  Clock,
  Check,
  Share2
} from 'lucide-react';

interface ConvocatoriasViewProps {
  initialPartidoId?: string;
}

export const ConvocatoriasView: React.FC<ConvocatoriasViewProps> = ({ initialPartidoId }) => {
  const {
    partidos,
    jugadores,
    toggleConvocatoria,
    setConvocatoriaEstado,
    exportSheet,
    addToast,
    getTeamEscudo
  } = useClub();

  const [selectedPartidoId, setSelectedPartidoId] = useState<string>(
    initialPartidoId || partidos[0]?.id || ''
  );
  const [copied, setCopied] = useState(false);

  const selectedPartido = useMemo(() => {
    return partidos.find(p => p.id === selectedPartidoId) || partidos[0];
  }, [partidos, selectedPartidoId]);

  // Jugadores elegibles (del mismo equipo o categoría, o todos si no hay coincidencia)
  const eligibleJugadores = useMemo(() => {
    if (!selectedPartido) return jugadores;
    const matchByTeam = jugadores.filter(
      j => j.equipo.toLowerCase() === selectedPartido.equipo.toLowerCase() ||
           j.categoria.toLowerCase() === selectedPartido.categoria.toLowerCase()
    );
    return matchByTeam.length > 0 ? matchByTeam : jugadores;
  }, [jugadores, selectedPartido]);

  // Mapa de estados de convocatoria para el partido actual
  const convocatoriasMap = useMemo(() => {
    const map = new Map<string, EstadoConvocatoria>();
    if (!selectedPartido) return map;
    const convocadosList = selectedPartido.convocados || [];
    eligibleJugadores.forEach(j => {
      map.set(j.id, convocadosList.includes(j.id) ? 'convocado' : 'no convocado');
    });
    return map;
  }, [selectedPartido, eligibleJugadores]);

  const totalConvocados = useMemo(() => {
    let count = 0;
    eligibleJugadores.forEach(j => {
      if (convocatoriasMap.get(j.id) === 'convocado') {
        count++;
      }
    });
    return count;
  }, [eligibleJugadores, convocatoriasMap]);

  // Acciones en lote
  const handleConvocarTodos = async () => {
    if (!selectedPartido) return;
    for (const j of eligibleJugadores) {
      await setConvocatoriaEstado(selectedPartido.id, j.id, 'convocado');
    }
    addToast({
      type: 'success',
      title: 'Convocatoria completa',
      message: `Se han convocado ${eligibleJugadores.length} jugadores.`
    });
  };

  const handleDesconvocarTodos = async () => {
    if (!selectedPartido) return;
    for (const j of eligibleJugadores) {
      await setConvocatoriaEstado(selectedPartido.id, j.id, 'no convocado');
    }
    addToast({
      type: 'info',
      title: 'Convocatoria reiniciada',
      message: 'Todos los jugadores marcados como no convocados.'
    });
  };

  const handleShareSquad = async () => {
    if (!selectedPartido) return;
    const convocadosList = eligibleJugadores
      .filter(j => convocatoriasMap.get(j.id) === 'convocado')
      .map(j => `• #${j.dorsal} ${j.nombre} (${j.posicion})`)
      .join('\n');

    const text = `📋 CONVOCATORIA OFICIAL\n⚽ ${selectedPartido.local} vs ${selectedPartido.visitante}\n🏆 Categoría: ${selectedPartido.categoria}\n📅 Fecha: ${new Date(selectedPartido.fecha).toLocaleDateString('es-ES')}\n\nJUGADORES CONVOCADOS (${totalConvocados}):\n${convocadosList || 'Ninguno aún'}\n\n¡A por los 3 puntos! ⚽🔥`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Convocatoria: ${selectedPartido.local} vs ${selectedPartido.visitante}`,
          text
        });
        return;
      } catch (err) {
        // Cancelado o fallback a portapapeles
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
    setCopied(true);
    addToast({
      type: 'success',
      title: 'Copiado al portapapeles',
      message: 'Lista de convocatoria lista para compartir por WhatsApp o redes.'
    });
    setTimeout(() => setCopied(false), 3000);
  };

  if (!selectedPartido) {
    return (
      <div className="bg-white p-8 rounded-2xl border text-center text-gray-400">
        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="font-semibold text-sm">No hay partidos creados para gestionar convocatorias.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-athletic tracking-tight">
            CONVOCATORIAS POR <span className="text-orange-600">PARTIDO</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Selecciona el partido y confecciona la lista de citados para el encuentro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSheet('convocatorias')}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Exportar Convocatorias
          </button>
          <button
            onClick={handleShareSquad}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-orange-400" />}
            {copied ? '¡Copiado!' : 'Compartir Lista (WhatsApp)'}
          </button>
        </div>
      </div>

      {/* Selector de Partido Activo */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Seleccionar Partido a Convocar:
            </label>
            <select
              value={selectedPartidoId}
              onChange={e => setSelectedPartidoId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              {partidos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.local} vs {p.visitante} — {p.categoria} ({new Date(p.fecha).toLocaleDateString('es-ES')})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleConvocarTodos}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
            >
              Convocar a Todos
            </button>
            <button
              onClick={handleDesconvocarTodos}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
            >
              Limpiar Selección
            </button>
          </div>
        </div>

        {/* Info Banner del Partido con Escudos */}
        <div className="bg-gray-950 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-gray-800 shadow-inner">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 overflow-hidden">
                <TeamShield
                  escudoUrl={getTeamEscudo(selectedPartido.local)}
                  teamName={selectedPartido.local}
                  size="sm"
                  className="w-full h-full"
                />
              </div>
              <span className="text-xs font-bold text-orange-400 font-athletic">VS</span>
              <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 overflow-hidden">
                <TeamShield
                  escudoUrl={getTeamEscudo(selectedPartido.visitante)}
                  teamName={selectedPartido.visitante}
                  size="sm"
                  className="w-full h-full"
                />
              </div>
            </div>
            <div className="truncate">
              <h3 className="font-bold text-sm sm:text-base font-athletic tracking-wide truncate">
                {selectedPartido.local} <span className="text-orange-400">vs</span> {selectedPartido.visitante}
              </h3>
              <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5 truncate">
                <span className="font-medium text-orange-300">{selectedPartido.categoria}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-gray-300">
                  <Clock className="w-3 h-3 text-orange-400" />
                  {new Date(selectedPartido.fecha).toLocaleString('es-ES', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </span>
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right bg-gray-900 px-5 py-2.5 rounded-xl border border-gray-800 shrink-0">
            <span className="text-[10px] uppercase font-bold text-gray-400">Total Convocados</span>
            <p className="text-2xl font-black font-athletic text-orange-400">
              {totalConvocados} <span className="text-xs text-gray-400">/ {eligibleJugadores.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Jugadores para Convocar */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-150 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">
            Plantilla disponible ({eligibleJugadores.length} futbolistas)
          </h3>
          <span className="text-xs text-gray-500">Haz clic para cambiar estado</span>
        </div>

        <div className="divide-y divide-gray-100">
          {eligibleJugadores.map(jugador => {
            const isConvocado = convocatoriasMap.get(jugador.id) === 'convocado';

            return (
              <div
                key={jugador.id}
                onClick={() => toggleConvocatoria(selectedPartido.id, jugador.id)}
                className={`p-4 flex items-center justify-between transition-all cursor-pointer select-none ${
                  isConvocado
                    ? 'bg-orange-50/40 hover:bg-orange-50/70'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-athletic text-sm transition-colors ${
                      isConvocado
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    #{jugador.dorsal || '-'}
                  </span>

                  <div>
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      {jugador.nombre}
                      <span className="text-[11px] font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {jugador.posicion}
                      </span>
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {jugador.equipo} • {jugador.categoria}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                      isConvocado
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}
                  >
                    {isConvocado ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Convocado
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-gray-400" />
                        No convocado
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
