import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { TeamShield } from './TeamShield';
import { Search, MapPin, Building2, Loader2, RefreshCw } from 'lucide-react';
import {
  FfcvEquipo,
  loadFfcvEquipos,
  searchFfcvEquipos,
  ffcvUbicacion,
  norm
} from '../services/ffcvEquipos';

interface BuscadorRivalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (equipo: FfcvEquipo) => void;
}

const MAX_RESULTADOS = 60;

export const BuscadorRivalModal: React.FC<BuscadorRivalModalProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<FfcvEquipo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async (force = false) => {
    setCargando(true);
    setError('');
    try {
      const data = await loadFfcvEquipos(force);
      setRows(data);
      if (!data.length) setError('No hay equipos FFCV disponibles todavía.');
    } catch {
      setError('No se pudo cargar el listado de equipos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const resultados = useMemo(() => searchFfcvEquipos(rows, query, MAX_RESULTADOS), [rows, query]);
  const ocultos = Math.max(rows.length - resultados.length, 0);

  const handleSelect = (row: FfcvEquipo) => {
    onSelect(row);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buscar equipo contrario"
      subtitle="Catálogo FFCV: clubes con escudo y campo de juego"
      maxWidth="max-w-lg"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            autoFocus
            placeholder="Escribe el nombre del equipo..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1.5 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
          <span>
            {cargando
              ? 'Cargando catálogo...'
              : `${resultados.length} de ${rows.length} equipos`}
          </span>
          <button
            type="button"
            onClick={() => void cargar(true)}
            disabled={cargando}
            className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {error && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            {error}
          </div>
        )}

        <div className="max-h-[55vh] overflow-y-auto overscroll-contain -mx-1 divide-y divide-gray-100">
          {cargando && !resultados.length && (
            <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Buscando equipos...</span>
            </div>
          )}

          {!cargando && resultados.map(row => (
            <button
              key={row.id}
              type="button"
              onClick={() => handleSelect(row)}
              className="w-full p-3 flex items-center gap-3 text-left hover:bg-orange-50/60 active:bg-orange-100 transition-colors rounded-xl"
            >
              <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-white border border-gray-200 rounded-xl p-0.5">
                <TeamShield
                  escudoUrl={row.escudo || undefined}
                  teamName={row.club}
                  size="xs"
                  className="w-full h-full"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-gray-900 truncate flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  {resalta(row.club, query)}
                </div>
                <div className="text-[11px] text-gray-500 truncate flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  {ffcvUbicacion(row) || 'Sin ubicación registrada'}
                </div>
              </div>
            </button>
          ))}

          {!cargando && !resultados.length && !error && (
            <p className="py-8 text-center text-sm text-gray-400">
              {query ? `Sin resultados para "${query}"` : 'No hay equipos en el catálogo.'}
            </p>
          )}
        </div>

        {ocultos > 0 && (
          <p className="text-[10px] text-gray-400 text-center">
            Mostrando los primeros {MAX_RESULTADOS} resultados. Afina la búsqueda para ver más.
          </p>
        )}

        <p className="text-[10px] text-gray-400 text-center">
          Al seleccionar se rellenan el nombre, el escudo y la ubicación del rival.
        </p>
      </div>
    </Modal>
  );
};

/** Resalta la coincidencia de la búsqueda dentro del nombre (sin HTML). */
const resalta = (texto: string, query: string): React.ReactNode => {
  const q = norm(query).split(/\s+/).filter(Boolean)[0];
  if (!q) return texto;
  const idx = norm(texto).indexOf(q);
  if (idx < 0) return texto;
  return (
    <>
      {texto.slice(0, idx)}
      <mark className="bg-orange-200/70 text-inherit rounded-sm">{texto.slice(idx, idx + q.length)}</mark>
      {texto.slice(idx + q.length)}
    </>
  );
};
