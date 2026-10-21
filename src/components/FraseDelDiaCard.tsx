import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useClub } from '../context/ClubContext';

interface FraseDelDiaCardProps {
  /** Equipos candidatos en prioridad; si ninguno tiene frase se usa la del club (equipo vacío). */
  equipos: string[];
  className?: string;
}

/** Hash determinista por (día local, contexto): la frase cambia cada día pero es la misma para todos durante el día. */
const hashDelDia = (contexto: string): number => {
  const ahora = new Date();
  const dia = Math.floor((ahora.getTime() - ahora.getTimezoneOffset() * 60000) / 86400000);
  let h = Math.imul(dia + 1, 374761393) ^ 668265263;
  for (let i = 0; i < contexto.length; i++) {
    h = Math.imul(h ^ contexto.charCodeAt(i), 2654435761);
  }
  return (h ^ (h >>> 15)) >>> 0;
};

/**
 * Tarjeta "FRASE DEL DIA": muestra la frase fijada por el entrenador/admin si existe;
 * si no, una frase al azar del banco que rota cada día.
 */
export const FraseDelDiaCard: React.FC<FraseDelDiaCardProps> = ({ equipos, className = '' }) => {
  const { frases } = useClub();

  const fraseActiva = useMemo(() => {
    const norm = (v?: string) => (v || '').trim().toLowerCase();
    const candidatos = [...(equipos || []).map(norm).filter(Boolean)];
    if (!candidatos.includes('')) candidatos.push('');
    const conTexto = frases.filter(f => (f.frase || '').trim());
    // 1) Frase fijada a mano (prioridad por equipo antes que club)
    for (const cand of candidatos) {
      const fijas = conTexto.filter(f => f.fija && norm(f.equipo) === cand);
      if (fijas.length) return fijas[hashDelDia(cand) % fijas.length];
    }
    // 2) Sin frase fija: frase del banco (del equipo o del club) que rota cada día
    const banco = conTexto.filter(f => !f.fija && candidatos.includes(norm(f.equipo)));
    if (banco.length) return banco[hashDelDia(candidatos.join('|')) % banco.length];
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
