import React, { useState } from 'react';
import { useClub } from '../context/ClubContext';
import { Shield } from 'lucide-react';

export type ShieldSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface TeamShieldProps {
  name?: string;
  escudoUrl?: string;
  size?: ShieldSize;
  className?: string;
  showName?: boolean;
  nameClassName?: string;
}

const sizeConfig: Record<ShieldSize, { container: string; img: string; text: string; icon: string }> = {
  xs: {
    container: 'w-5 h-5 rounded-md',
    img: 'w-5 h-5',
    text: 'text-[9px]',
    icon: 'w-3 h-3'
  },
  sm: {
    container: 'w-7 h-7 rounded-lg',
    img: 'w-7 h-7',
    text: 'text-[10px]',
    icon: 'w-4 h-4'
  },
  md: {
    container: 'w-10 h-10 rounded-xl',
    img: 'w-10 h-10',
    text: 'text-xs',
    icon: 'w-5 h-5'
  },
  lg: {
    container: 'w-13 h-13 rounded-2xl',
    img: 'w-13 h-13',
    text: 'text-sm',
    icon: 'w-7 h-7'
  },
  xl: {
    container: 'w-16 h-16 rounded-2xl',
    img: 'w-16 h-16',
    text: 'text-base',
    icon: 'w-8 h-8'
  },
  '2xl': {
    container: 'w-24 h-24 rounded-3xl',
    img: 'w-24 h-24',
    text: 'text-2xl',
    icon: 'w-12 h-12'
  }
};

// Generador de color consistente basado en el nombre del equipo
const getTeamGradient = (name: string): string => {
  if (!name) return 'from-orange-500 to-amber-600';
  const lower = name.toLowerCase();
  if (lower.includes('naranja')) return 'from-orange-500 to-amber-600';
  if (lower.includes('promesa') || lower.includes('azul') || lower.includes('real')) return 'from-blue-600 to-indigo-700';
  if (lower.includes('fem') || lower.includes('morad') || lower.includes('rosa')) return 'from-purple-600 to-pink-600';
  if (lower.includes('rojo') || lower.includes('atlet')) return 'from-red-600 to-rose-700';
  if (lower.includes('verde') || lower.includes('sport')) return 'from-emerald-600 to-teal-700';
  if (lower.includes('rayo') || lower.includes('amarill')) return 'from-amber-500 to-yellow-600';
  
  // Hash para otros nombres
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = lower.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    'from-orange-500 to-amber-600',
    'from-blue-600 to-indigo-700',
    'from-emerald-600 to-teal-700',
    'from-red-600 to-rose-700',
    'from-purple-600 to-indigo-700',
    'from-cyan-600 to-blue-700'
  ];
  return gradients[Math.abs(hash) % gradients.length];
};

const getInitials = (name: string): string => {
  if (!name) return 'CF';
  const clean = name.replace(/^(club|c\.d\.|cd|u\.d\.|ud|f\.c\.|fc)\s+/i, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const TeamShield: React.FC<TeamShieldProps> = ({
  name = 'Club',
  escudoUrl,
  size = 'md',
  className = '',
  showName = false,
  nameClassName = 'text-xs font-bold text-gray-800'
}) => {
  const { getTeamEscudo } = useClub();
  const [imageError, setImageError] = useState(false);

  // Obtener URL del escudo: prioridad a la prop explícita, luego búsqueda por nombre de equipo
  const resolvedUrl = escudoUrl || (name ? getTeamEscudo(name) : undefined);
  const cfg = sizeConfig[size] || sizeConfig.md;
  const gradient = getTeamGradient(name);
  const initials = getInitials(name);

  const renderShieldVisual = () => {
    if (resolvedUrl && !imageError) {
      return (
        <div
          className={`${cfg.container} shrink-0 flex items-center justify-center overflow-hidden bg-white/95 p-1 shadow-sm border border-black/10 ring-1 ring-black/5 hover:scale-105 transition-transform ${className}`}
          title={name}
        >
          <img
            src={resolvedUrl}
            alt={`Escudo ${name}`}
            className="w-full h-full object-contain filter drop-shadow-xs"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    // Fallback elegante con escudo estilizado y gradiente
    return (
      <div
        className={`${cfg.container} shrink-0 flex items-center justify-center font-athletic font-extrabold text-white bg-gradient-to-br ${gradient} shadow-sm border border-white/20 ring-1 ring-black/10 select-none hover:scale-105 transition-transform ${className}`}
        title={name}
      >
        <span className={`${cfg.text} tracking-wider filter drop-shadow-xs`}>
          {initials}
        </span>
      </div>
    );
  };

  if (!showName) {
    return renderShieldVisual();
  }

  return (
    <div className="inline-flex items-center gap-2">
      {renderShieldVisual()}
      <span className={nameClassName}>{name}</span>
    </div>
  );
};
