import React, { useMemo, useState } from 'react';
import { useClub } from '../context/ClubContext';
import { FilaVestuario, Jugador } from '../types';
import { Shirt, Plus, Trash2, Save, Ruler, Lock } from 'lucide-react';

/** Opciones de talla sugeridas (se puede escribir cualquier otra). */
const TALLAS_PRESET = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14',
  'XS', 'S', 'M', 'L', 'XL', 'XXL'
];

const INPUT_TALLA =
  'w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 ' +
  'focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder:text-gray-300';

const INPUT_TEXTO =
  'rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 ' +
  'focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder:text-gray-300';

export const VestuarioView: React.FC = () => {
  const {
    jugadores,
    equipos,
    vestuario,
    vestuarioTipos,
    saveHojaVestuario,
    saveVestuarioTipo,
    deleteVestuarioTipo,
    jugadorActual,
    can,
    addToast
  } = useClub();

  const canManage = can('manage:vestuario');
  /** Quien es jugador y no gestiona rellena solo su propia hoja. */
  const soyJugador = useMemo(
    () => !!jugadorActual && !canManage && jugadores.some(j => j.id === jugadorActual.id),
    [jugadorActual, canManage, jugadores]
  );

  const [draft, setDraft] = useState<Record<string, Partial<FilaVestuario>>>({});
  const [saving, setSaving] = useState(false);
  const [equipoSel, setEquipoSel] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [nuevaPrenda, setNuevaPrenda] = useState('');

  const prendas = useMemo(
    () =>
      [...vestuarioTipos]
        .filter(t => t.activo !== false)
        .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0) || a.nombre.localeCompare(b.nombre, 'es')),
    [vestuarioTipos]
  );
  const nombresPrendas = prendas.map(p => p.nombre);

  /** Datos ya guardados de un jugador (camiseta + tallas por prenda). */
  const baseRow = (j: Jugador): FilaVestuario => ({
    jugadorId: j.id,
    nombreCamiseta: j.nombreCamiseta || '',
    numeroCamiseta: j.numeroCamiseta || '',
    tallas: Object.fromEntries(
      vestuario.filter(v => v.jugadorId === j.id).map(v => [v.tipoPrenda, v.talla || ''])
    )
  });

  /** Fila visible = guardado + borrador local sin guardar. */
  const rowOf = (j: Jugador): FilaVestuario => {
    const d = draft[j.id];
    const b = baseRow(j);
    if (!d) return b;
    return { ...b, ...d, tallas: { ...b.tallas, ...(d.tallas || {}) } };
  };

  const filaCambiada = (j: Jugador): boolean => {
    const row = rowOf(j);
    const base = baseRow(j);
    if ((row.nombreCamiseta || '') !== (base.nombreCamiseta || '')) return true;
    if ((row.numeroCamiseta || '') !== (base.numeroCamiseta || '')) return true;
    const claves = new Set([
      ...Object.keys(row.tallas || {}),
      ...Object.keys(base.tallas || {}),
      ...nombresPrendas
    ]);
    for (const k of claves) {
      if ((row.tallas?.[k] || '') !== (base.tallas?.[k] || '')) return true;
    }
    return false;
  };

  const setNombreCamiseta = (id: string, valor: string) =>
    setDraft(prev => ({ ...prev, [id]: { ...prev[id], nombreCamiseta: valor } }));

  const setNumeroCamiseta = (id: string, valor: string) =>
    setDraft(prev => ({ ...prev, [id]: { ...prev[id], numeroCamiseta: valor } }));

  const setTalla = (id: string, prenda: string, valor: string) =>
    setDraft(prev => ({
      ...prev,
      [id]: { ...prev[id], tallas: { ...(prev[id]?.tallas || {}), [prenda]: valor } }
    }));

  const filasVisibles = useMemo(() => {
    let lista = soyJugador && jugadorActual ? jugadores.filter(j => j.id === jugadorActual.id) : jugadores;
    if (equipoSel) lista = lista.filter(j => j.equipo === equipoSel);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(j => j.nombre.toLowerCase().includes(q));
    }
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [jugadores, soyJugador, jugadorActual, equipoSel, busqueda]);

  const pendientes = filasVisibles.filter(filaCambiada);

  const guardar = async () => {
    if (saving) return;
    if (!pendientes.length) {
      addToast({ type: 'info', title: 'Sin cambios', message: 'No hay modificaciones que guardar.' });
      return;
    }
    setSaving(true);
    const ok = await saveHojaVestuario(pendientes.map(rowOf));
    if (ok) setDraft({});
    setSaving(false);
  };

  const añadirPrenda = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await saveVestuarioTipo({ nombre: nuevaPrenda });
    if (ok) setNuevaPrenda('');
  };

  const quitarPrenda = async (id: string, nombre: string) => {
    if (
      !window.confirm(
        `¿Quitar "${nombre}" del catálogo? También se borrarán las tallas de esa prenda de la hoja.`
      )
    )
      return;
    await deleteVestuarioTipo(id);
  };

  // ---------------------------------------------------------------- Cabecera
  const cabecera = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 flex items-center justify-center shrink-0">
          <Shirt className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-athletic text-gray-900 tracking-tight">
            Hoja de datos de vestuario
          </h1>
          <p className="text-sm text-gray-500">
            {canManage
              ? 'Gestiona las prendas y revisa tallas, nombre y número de camiseta de la plantilla.'
              : soyJugador
                ? 'Indica tus tallas y los datos impresos en tu camiseta.'
                : 'Consulta de tallas y de nombre/número de camiseta de la plantilla.'}
          </p>
        </div>
      </div>
      {canManage && (
        <button
          type="button"
          onClick={guardar}
          disabled={saving || !pendientes.length}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando…' : `Guardar${pendientes.length ? ` (${pendientes.length})` : ''}`}
        </button>
      )}
    </div>
  );

  if (!vestuarioTipos.length && !canManage) {
    return (
      <div className="space-y-5">
        {cabecera}
        <div className="bg-white p-8 rounded-2xl border border-gray-150 shadow-sm text-center text-gray-400">
          Todavía no hay prendas publicadas en la hoja de vestuario.
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- Jugador
  if (soyJugador && jugadorActual) {
    const fila = rowOf(jugadorActual);
    const cambios = filaCambiada(jugadorActual);
    return (
      <div className="space-y-5">
        {cabecera}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-gray-900">
            <Ruler className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-black font-athletic">Mi pedido</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Nombre en la espalda
              </span>
              <input
                type="text"
                className={`${INPUT_TEXTO} w-full`}
                value={fila.nombreCamiseta || ''}
                placeholder="Ej: MARTÍNEZ"
                onChange={e => setNombreCamiseta(jugadorActual.id, e.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Número de camiseta
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                className={`${INPUT_TEXTO} w-full`}
                value={fila.numeroCamiseta || ''}
                placeholder="Ej: 10"
                onChange={e => setNumeroCamiseta(jugadorActual.id, e.target.value.replace(/\D/g, ''))}
              />
            </label>
          </div>

          <div className="space-y-3">
            {prendas.map(p => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-gray-150 bg-gray-50/60 px-4 py-3"
              >
                <span className="text-sm font-bold text-gray-800">{p.nombre}</span>
                <select
                  className={`${INPUT_TALLA} w-full sm:w-32`}
                  value={fila.tallas?.[p.nombre] || ''}
                  onChange={e => setTalla(jugadorActual.id, p.nombre, e.target.value)}
                >
                  <option value="">Sin talla</option>
                  {TALLAS_PRESET.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {!prendas.length && (
              <p className="text-sm text-gray-400">
                Aún no hay prendas: el club publicará el catálogo pronto.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={guardar}
            disabled={saving || !cambios}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando…' : 'Guardar mis datos'}
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- Matriz
  return (
    <div className="space-y-5">
      {cabecera}

      {canManage && (
        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-4 sm:p-5 space-y-3">
          <h2 className="text-lg font-black font-athletic text-gray-900">Prendas del club</h2>
          <div className="flex flex-wrap gap-2">
            {prendas.map(p => (
              <span
                key={p.id}
                className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-sm font-bold text-fuchsia-700"
              >
                {p.nombre}
                <button
                  type="button"
                  title={`Quitar ${p.nombre}`}
                  onClick={() => quitarPrenda(p.id, p.nombre)}
                  className="text-fuchsia-400 transition-colors hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </span>
            ))}
            {!prendas.length && (
              <span className="text-sm text-gray-400">
                Sin prendas todavía. Añade la primera o ejecuta <code className="font-mono">vestuario.sql</code>.
              </span>
            )}
          </div>
          <form onSubmit={añadirPrenda} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              className={`${INPUT_TEXTO} w-56`}
              value={nuevaPrenda}
              placeholder="Ej: Media alta"
              onChange={e => setNuevaPrenda(e.target.value)}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
              disabled={!nuevaPrenda.trim()}
            >
              <Plus className="w-4 h-4" />
              Añadir prenda
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {equipos.length > 1 && (
          <select
            className={`${INPUT_TALLA} w-auto`}
            value={equipoSel}
            onChange={e => setEquipoSel(e.target.value)}
          >
            <option value="">Todos los equipos</option>
            {equipos.map(e => (
              <option key={e.id} value={e.nombre}>
                {e.nombre}
              </option>
            ))}
          </select>
        )}
        <input
          type="search"
          className={`${INPUT_TEXTO} w-full sm:w-56`}
          value={busqueda}
          placeholder="Buscar jugador…"
          onChange={e => setBusqueda(e.target.value)}
        />
        {!canManage && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400">
            <Lock className="w-3.5 h-3.5" /> Solo lectura
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Jugador</th>
                <th className="px-3 py-3">Equipo</th>
                <th className="px-3 py-3">Nombre camiseta</th>
                <th className="px-3 py-3">Nº</th>
                {prendas.map(p => (
                  <th key={p.id} className="px-3 py-3 whitespace-nowrap">
                    {p.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filasVisibles.map(j => {
                const row = rowOf(j);
                const cambiada = filaCambiada(j);
                return (
                  <tr
                    key={j.id}
                    className={cambiada ? 'bg-orange-50/60' : 'bg-white'}
                  >
                    <td className="px-4 py-2.5 font-semibold text-gray-900 whitespace-nowrap">
                      {j.nombre}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{j.equipo}</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        className={`${INPUT_TEXTO} w-36`}
                        value={row.nombreCamiseta || ''}
                        placeholder="—"
                        disabled={!canManage}
                        onChange={e => setNombreCamiseta(j.id, e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        className={`${INPUT_TEXTO} w-16`}
                        value={row.numeroCamiseta || ''}
                        placeholder="—"
                        disabled={!canManage}
                        onChange={e => setNumeroCamiseta(j.id, e.target.value.replace(/\D/g, ''))}
                      />
                    </td>
                    {prendas.map(p => (
                      <td key={p.id} className="px-3 py-2.5">
                        {canManage ? (
                          <input
                            type="text"
                            list="tallas-vestuario"
                            className={INPUT_TALLA}
                            value={row.tallas?.[p.nombre] || ''}
                            placeholder="—"
                            onChange={e => setTalla(j.id, p.nombre, e.target.value)}
                          />
                        ) : (
                          <span
                            className={`inline-block rounded-lg px-2 py-1 text-xs font-bold ${
                              row.tallas?.[p.nombre]
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-300'
                            }`}
                          >
                            {row.tallas?.[p.nombre] || '—'}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {!filasVisibles.length && (
                <tr>
                  <td
                    colSpan={4 + prendas.length}
                    className="px-4 py-10 text-center text-gray-400"
                  >
                    No hay jugadores que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <datalist id="tallas-vestuario">
        {TALLAS_PRESET.map(t => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
          <span className="text-sm text-gray-500">
            {pendientes.length
              ? `${pendientes.length} ficha${pendientes.length > 1 ? 's' : ''} sin guardar`
              : 'Todo guardado. Las filas resaltadas tienen cambios pendientes.'}
          </span>
          <button
            type="button"
            onClick={guardar}
            disabled={saving || !pendientes.length}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
};
