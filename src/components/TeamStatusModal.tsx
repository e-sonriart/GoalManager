import React, { useMemo } from 'react';
import { Modal } from './Modal';
import { useClub } from '../context/ClubContext';
import { computeStandings } from '../utils/standings';
import { Trophy, Shield } from 'lucide-react';

interface TeamStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatDif = (dif: number) => (dif > 0 ? `+${dif}` : `${dif}`);

export const TeamStatusModal: React.FC<TeamStatusModalProps> = ({ isOpen, onClose }) => {
  const { partidos, equipos } = useClub();

  const standings = useMemo(() => computeStandings(partidos), [partidos]);
  const clubTeams = useMemo(
    () => new Set(equipos.map(e => e.nombre.toLowerCase().trim())),
    [equipos]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Estado de los Equipos"
      subtitle="Resumen y clasificación por categoría"
      maxWidth="max-w-4xl"
    >
      {standings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
            <Trophy className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Todavía no hay resultados</p>
          <p className="text-xs text-gray-500 mt-1">
            La clasificación aparecerá cuando se registren partidos finalizados.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {standings.map(({ categoria, rows }) => (
            <section key={categoria}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-5 rounded-full bg-emerald-500" />
                <h4 className="text-sm font-bold text-gray-900 font-athletic tracking-wide uppercase">
                  {categoria}
                </h4>
                <span className="text-[11px] text-gray-400">{rows.length} equipos</span>
              </div>
              <div className="overflow-x-auto scroll-x rounded-xl border border-gray-100">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">
                      <th className="px-2 py-2 text-center font-semibold w-8">#</th>
                      <th className="px-3 py-2 text-left font-semibold">Equipo</th>
                      <th className="px-2 py-2 text-center font-semibold">PJ</th>
                      <th className="px-2 py-2 text-center font-semibold">G</th>
                      <th className="px-2 py-2 text-center font-semibold">E</th>
                      <th className="px-2 py-2 text-center font-semibold">P</th>
                      <th className="px-2 py-2 text-center font-semibold">GF</th>
                      <th className="px-2 py-2 text-center font-semibold">GC</th>
                      <th className="px-2 py-2 text-center font-semibold">DG</th>
                      <th className="px-3 py-2 text-center font-semibold">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row, index) => {
                      const isClub = clubTeams.has(row.equipo.toLowerCase().trim());
                      return (
                        <tr
                          key={row.equipo}
                          className={isClub ? 'bg-emerald-50/60' : 'bg-white'}
                        >
                          <td className="px-2 py-2 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-bold ${
                                index === 0
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-left">
                            <div className="flex items-center gap-2">
                              {isClub ? (
                                <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <span className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span
                                className={`truncate ${
                                  isClub ? 'font-bold text-emerald-900' : 'font-medium text-gray-700'
                                }`}
                              >
                                {row.equipo}
                              </span>
                              {isClub && (() => {
                                const eq = equipos.find(e => e.nombre.toLowerCase().trim() === row.equipo.toLowerCase().trim());
                                const meta = eq ? [eq.division, eq.grupo].filter(Boolean).join(' · ') : '';
                                return meta ? (
                                  <span className="text-[10px] text-gray-500 font-medium shrink-0">{meta}</span>
                                ) : null;
                              })()}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center text-gray-600">{row.jugados}</td>
                          <td className="px-2 py-2 text-center text-gray-600">{row.ganados}</td>
                          <td className="px-2 py-2 text-center text-gray-600">{row.empatados}</td>
                          <td className="px-2 py-2 text-center text-gray-600">{row.perdidos}</td>
                          <td className="px-2 py-2 text-center text-gray-600">{row.gf}</td>
                          <td className="px-2 py-2 text-center text-gray-600">{row.gc}</td>
                          <td className="px-2 py-2 text-center text-gray-600">{formatDif(row.dif)}</td>
                          <td className="px-3 py-2 text-center font-bold text-gray-900">{row.puntos}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
};
