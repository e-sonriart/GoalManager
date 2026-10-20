import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useClub } from '../context/ClubContext';

interface FraseDelDiaCardProps {
  /** Equipos candidatos en prioridad; si ninguno tiene frase se usa la del club (equipo vacío). */
  equipos: string[];
  className?: string;
}

/**
 * Tarjeta "FRASE DEL DIA": muestra la frase motivadora activa de un equipo
 * (o la del club) debajo del cuadro correspondiente.
 */
export const FraseDelDiaCard: React.FC<FraseDelDiaCardProps> = ({ equipos, className = '' }) => {
  const { frases } = useClub();

  const fraseActiva = useMemo(() => {
    const norm = (v?: string) => (v || '').trim().toLowerCase();
    const candidatos = [...(equipos || []).map(norm).filter(Boolean)];
    if (!candidatos.includes('')) candidatos.push('');
    for (const cand of candidatos) {
      const hit = frases.find(f => norm(f.equipo) === cand);
      if (hit && (hit.frase || '').trim()) return hit;
    }
    return null;
  }, [frases, equipos]);

  if (!fraseActiva) return null;

  return (
    <div
      className={`rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 p-3.5 sm:p-4 shadow-xs ${className}`}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-orange-600">
        <Sparkles className="w-3.5 h-3.5" /> FRASE DEL DIA
      </p>
      <p className="mt-1.5 font-athletic text-sm sm:text-base font-bold text-gray-900 leading-snug">
        “{fraseActiva.frase}”
      </p>
      {fraseActiva.creadaPor && (
        <p className="mt-1 text-[10px] font-semibold text-orange-500">— {fraseActiva.creadaPor}</p>
      )}
    </div>
  );
};
