import React, { useEffect, useRef, useState } from 'react';
import { useClub } from '../context/ClubContext';
import { TeamShield } from './TeamShield';
import { Check, ChevronDown, Users } from 'lucide-react';

/**
 * Selector de equipo en la barra superior: solo aparece cuando el usuario en
 * sesión tiene más de un equipo bajo su control (entrenador con varios,
 * coordinador, admin/directiva). Permite mostrar uno en concreto o todos.
 */
export const SelectorEquipos: React.FC = () => {
  const { equiposControlables, equipoFiltro, setEquipoFiltro } = useClub();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (equiposControlables.length < 2) return null;

  const etiqueta = equipoFiltro || 'Todos';

  return (
    <div ref={rootRef} className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title={`Mostrando: ${etiqueta} (cambiar equipo)`}
        aria-label="Filtrar por equipo: mostrar uno en concreto o todos"
        aria-expanded={open}
        className={`h-10 px-2 sm:px-3 rounded-xl border flex items-center gap-1.5 transition-all active:scale-95 ${
          equipoFiltro
            ? 'bg-orange-950/50 border-orange-700/70 text-orange-200 hover:bg-orange-900/50'
            : 'bg-gray-900 hover:bg-gray-800 border-gray-700/80 text-gray-300 hover:text-white'
        }`}
      >
        <Users className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline text-xs font-bold max-w-[110px] truncate">{etiqueta}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 overflow-hidden">
          <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Mostrar equipo
          </p>
          <button
            type="button"
            onClick={() => {
              setEquipoFiltro(null);
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-gray-50 ${
              !equipoFiltro ? 'bg-orange-50 text-orange-700 font-bold' : 'text-gray-700'
            }`}
          >
            <span className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-gray-500" />
            </span>
            <span className="flex-1 truncate">Todos los equipos</span>
            {!equipoFiltro && <Check className="w-4 h-4 text-orange-500 shrink-0" />}
          </button>

          <div className="border-t border-gray-100 mx-3" />

          <div className="max-h-72 overflow-y-auto py-1">
            {equiposControlables.map(nombre => {
              const activo = (equipoFiltro || '').trim().toLowerCase() === nombre.trim().toLowerCase();
              return (
                <button
                  key={nombre}
                  type="button"
                  onClick={() => {
                    setEquipoFiltro(nombre);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    activo ? 'bg-orange-50 text-orange-700 font-bold' : 'text-gray-700'
                  }`}
                >
                  <TeamShield name={nombre} size="sm" />
                  <span className="flex-1 truncate">{nombre}</span>
                  {activo && <Check className="w-4 h-4 text-orange-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
