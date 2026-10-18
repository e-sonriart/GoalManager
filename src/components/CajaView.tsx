import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useClub } from '../context/ClubContext';
import { CajaJugador, Jugador, VestuarioTipo } from '../types';
import { Wallet, Save, Euro, AlertTriangle, Lock } from 'lucide-react';
import { cajaService, formatEuros, parseImporte, totalDe, pendienteCobroDe } from '../services/caja';
import { precioDe } from '../services/vestuario';

const INPUT_IMPORTE =
  'w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm font-semibold text-gray-900 ' +
  'focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 placeholder:text-gray-300 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500';

const INPUT_FILTRO =
  'rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 ' +
  'focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 placeholder:text-gray-300';

const CAMPOS = [
  { campo: 'matricula', label: 'Matrícula' },
  { campo: 'temporada', label: 'Temporada' },
  { campo: 'ropaNuevo', label: 'Ropa nuevo' },
  { campo: 'ropaRenovacion', label: 'Ropa renovación' }
] as const;

type CampoImporte = (typeof CAMPOS)[number]['campo'];

interface FilaTabla {
  jugador: Jugador;
  importes: Partial<CajaJugador>;
  sucia: boolean;
}

export const CajaView: React.FC = () => {
  const {
    jugadores,
    equipos,
    vestuario,
    vestuarioTipos,
    saveVestuarioTipo,
    clubConfig,
    can,
    addToast
  } = useClub();

  const puedeVer = can('view:caja');
  const puedeEditar = can('manage:caja');

  const [filas, setFilas] = useState<CajaJugador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [draft, setDraft] = useState<Record<string, Partial<CajaJugador>>>({});
  const [guardando, setGuardando] = useState(false);
  const [equipoSel, setEquipoSel] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [preciosDraft, setPreciosDraft] = useState<Record<string, string>>({});
  const [guardandoPrecios, setGuardandoPrecios] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setFilas(await cajaService.getAll());
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filaGuardada = (jugadorId: string): Partial<CajaJugador> =>
    filas.find(f => f.jugadorId === jugadorId || f.id === jugadorId) || {};

  const filaDe = (j: Jugador): Partial<CajaJugador> => ({
    ...filaGuardada(j.id),
    ...(draft[j.id] || {})
  });

  const sucia = (j: Jugador): boolean => {
    const b = filaGuardada(j.id);
    const d = draft[j.id];
    if (!d) return false;
    return CAMPOS.some(c => String(d[c.campo] ?? '') !== String(b[c.campo] ?? ''));
  };

  const setImporte = (jugadorId: string, campo: CampoImporte, valor: string) =>
    setDraft(prev => ({ ...prev, [jugadorId]: { ...prev[jugadorId], [campo]: valor } }));

  const filasVisibles: FilaTabla[] = useMemo(() => {
    let lista = jugadores;
    if (equipoSel) lista = lista.filter(j => j.equipo === equipoSel);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(j => j.nombre.toLowerCase().includes(q));
    }
    return [...lista]
      .sort(
        (a, b) =>
          (a.equipo || '').localeCompare(b.equipo || '', 'es') ||
          a.nombre.localeCompare(b.nombre, 'es')
      )
      .map(j => ({ jugador: j, importes: filaDe(j), sucia: sucia(j) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jugadores, equipoSel, busqueda, draft, filas]);

  const pendientes = filasVisibles.filter(f => f.sucia);

  /** Suma de cada columna sobre lo que se ve en pantalla. */
  const totales = useMemo(() => {
    const t: Record<CampoImporte, number> = {
      matricula: 0,
      temporada: 0,
      ropaNuevo: 0,
      ropaRenovacion: 0
    };
    for (const f of filasVisibles) {
      for (const c of CAMPOS) t[c.campo] += parseImporte(f.importes[c.campo]);
    }
    return { ...t, total: t.matricula + t.temporada + t.ropaNuevo + t.ropaRenovacion };
  }, [filasVisibles]);

  /** Ropa entregada y sin pagar de toda la lista visible (aviso a caja). */
  const pendienteCobro = useMemo(() => {
    let prendas = 0;
    let euros = 0;
    for (const f of filasVisibles) {
      const p = pendienteCobroDe(f.jugador.id, vestuario, vestuarioTipos);
      prendas += p.prendas;
      euros += p.euros;
    }
    return { prendas, euros };
  }, [filasVisibles, vestuario, vestuarioTipos]);

  const guardar = async () => {
    if (guardando || !pendientes.length) return;
    setGuardando(true);
    try {
      const ahora = new Date().toISOString();
      for (const f of pendientes) {
        const j = f.jugador;
        const row: CajaJugador = {
          id: j.id,
          jugadorId: j.id,
          matricula: String(f.importes.matricula ?? '').trim(),
          temporada: String(f.importes.temporada ?? '').trim(),
          ropaNuevo: String(f.importes.ropaNuevo ?? '').trim(),
          ropaRenovacion: String(f.importes.ropaRenovacion ?? '').trim(),
          total: String(totalDe(f.importes)),
          actualizadoEn: ahora
        };
        const existe = filas.some(x => x.jugadorId === j.id || x.id === j.id);
        const saved = await cajaService.save(row, existe);
        setFilas(prev => (existe ? prev.map(x => (x.id === saved.id ? saved : x)) : [...prev, saved]));
      }
      setDraft({});
      addToast({
        type: 'success',
        title: 'Caja guardada',
        message:
          pendientes.length === 1 ? 'Importe actualizado.' : `${pendientes.length} fichas actualizadas.`
      });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'No se pudieron guardar los importes de caja.' });
    } finally {
      setGuardando(false);
    }
  };

  // ---------------------------------------------------- Precios de las prendas
  const precioActual = (t: VestuarioTipo): string =>
    preciosDraft[t.id] !== undefined ? preciosDraft[t.id] : precioDe(t);
  const preciosSucios = vestuarioTipos.some(t => precioActual(t) !== precioDe(t));

  const guardarPrecios = async () => {
    if (guardandoPrecios || !preciosSucios) return;
    setGuardandoPrecios(true);
    try {
      const cambiadas = vestuarioTipos.filter(t => precioActual(t) !== precioDe(t));
      for (const t of cambiadas) {
        await saveVestuarioTipo({
          id: t.id,
          nombre: t.nombre,
          tallasDisponibles: t.tallasDisponibles || '',
          precio: precioActual(t),
          orden: t.orden,
          activo: t.activo
        });
      }
      setPreciosDraft({});
      addToast({
        type: 'success',
        title: 'Precios guardados',
        message: `${cambiadas.length} prenda${cambiadas.length === 1 ? '' : 's'} actualizada${cambiadas.length === 1 ? '' : 's'}.`
      });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'No se pudieron guardar los precios.' });
    } finally {
      setGuardandoPrecios(false);
    }
  };

  // ------------------------------------------------------------------ Permisos
  if (!puedeVer) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-150 shadow-sm text-center text-gray-400">
        La hoja de caja solo está disponible para el rol Caja y el administrador.
      </div>
    );
  }

  // ------------------------------------------------------------------ Cabecera
  const cabecera = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 border border-cyan-200 flex items-center justify-center shrink-0">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-athletic text-gray-900 tracking-tight">
            Hoja de caja
          </h1>
          <p className="text-sm text-gray-500">
            Matrícula, temporada y ropa por jugador{clubConfig?.temporada ? ` · ${clubConfig.temporada}` : ''}
            {puedeEditar ? ' · importes editables por el rol Caja.' : ' · solo lectura.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
            pendienteCobro.euros > 0 || pendienteCobro.prendas > 0
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}
          title="Ropa marcada como entregada en vestuario y todavía sin pagar"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          {pendienteCobro.prendas
            ? `Entregado sin pagar: ${pendienteCobro.prendas} ud.${pendienteCobro.euros ? ` · ${formatEuros(pendienteCobro.euros)}` : ''}`
            : 'Nada pendiente de cobro'}
        </span>
        {puedeEditar && (
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || !pendientes.length}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            {guardando ? 'Guardando…' : `Guardar${pendientes.length ? ` (${pendientes.length})` : ''}`}
          </button>
        )}
      </div>
    </div>
  );

  if (cargando) {
    return (
      <div className="space-y-5">
        {cabecera}
        <div className="bg-white p-8 rounded-2xl border border-gray-150 shadow-sm text-center text-gray-400">
          Cargando la hoja de caja…
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ Precios
  const bloquePrecios = (
    <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black font-athletic text-gray-900">Precio de cada prenda</h2>
          <p className="text-xs text-gray-500">
            El precio se muestra en la hoja de vestuario y calcula lo que hay entregado sin pagar.
            {puedeEditar ? '' : ' Solo el rol Caja puede modificarlo.'}
          </p>
        </div>
        {puedeEditar && (
          <button
            type="button"
            onClick={guardarPrecios}
            disabled={guardandoPrecios || !preciosSucios}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            {guardandoPrecios ? 'Guardando…' : 'Guardar precios'}
          </button>
        )}
      </div>
      {vestuarioTipos.length ? (
        <div className="flex flex-wrap gap-2">
          {vestuarioTipos
            .filter(t => t.activo !== false)
            .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0) || a.nombre.localeCompare(b.nombre, 'es'))
            .map(t => (
              <label
                key={t.id}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5"
              >
                <span className="text-sm font-semibold text-gray-700">{t.nombre}</span>
                <Euro className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-20 bg-transparent text-sm font-bold text-gray-900 focus:outline-none placeholder:font-normal placeholder:text-gray-300"
                  value={precioActual(t)}
                  disabled={!puedeEditar}
                  placeholder="0"
                  aria-label={`Precio de ${t.nombre}`}
                  onChange={e => setPreciosDraft(prev => ({ ...prev, [t.id]: e.target.value }))}
                />
              </label>
            ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          Aún no hay prendas en el catálogo: las publica el rol vestuario.
        </p>
      )}
    </div>
  );

  // ------------------------------------------------------------------- Tabla
  const columnas = 7;
  let ultimoEquipo = '';

  return (
    <div className="space-y-5">
      {cabecera}
      {bloquePrecios}

      <div className="flex flex-wrap items-center gap-2">
        {equipos.length > 1 && (
          <select
            className={`${INPUT_FILTRO} w-auto`}
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
          className={`${INPUT_FILTRO} w-full sm:w-56`}
          value={busqueda}
          placeholder="Buscar jugador…"
          onChange={e => setBusqueda(e.target.value)}
        />
        {!puedeEditar && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400">
            <Lock className="w-3.5 h-3.5" /> Información privada de caja
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Jugador</th>
                {CAMPOS.map(c => (
                  <th key={c.campo} className="px-3 py-3 text-right">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3">Entregado sin pagar</th>
              </tr>
            </thead>

            {filasVisibles.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={columnas} className="px-4 py-10 text-center text-gray-400">
                    No hay jugadores que coincidan con el filtro.
                  </td>
                </tr>
              </tbody>
            )}

            <tbody className="divide-y divide-gray-100">
              {filasVisibles.map(f => {
                const j = f.jugador;
                const equipo = (j.equipo || '').trim() || 'Sin equipo';
                const mostrarEquipo = equipo !== ultimoEquipo;
                ultimoEquipo = equipo;
                const pendiente = pendienteCobroDe(j.id, vestuario, vestuarioTipos);
                const total = totalDe(f.importes);
                return (
                  <React.Fragment key={j.id}>
                    {mostrarEquipo && (
                      <tr className="bg-gray-100">
                        <td colSpan={columnas} className="px-4 py-1.5 text-xs font-black text-gray-700 uppercase tracking-wide">
                          {equipo}
                        </td>
                      </tr>
                    )}
                    <tr className={f.sucia ? 'bg-orange-50/60' : 'bg-white'}>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="block font-semibold text-gray-900">{j.nombre}</span>
                        <span className="block text-[11px] text-gray-400">
                          {j.categoria || '—'} · {j.dorsal ? `#${j.dorsal}` : 'sin dorsal'}
                        </span>
                      </td>
                      {CAMPOS.map(c => (
                        <td key={c.campo} className="px-3 py-2.5 text-right align-top">
                          {puedeEditar ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              className={`${INPUT_IMPORTE} ml-auto`}
                              value={String(f.importes[c.campo] ?? '')}
                              placeholder="0"
                              aria-label={`${c.label} de ${j.nombre}`}
                              onChange={e => setImporte(j.id, c.campo, e.target.value)}
                            />
                          ) : (
                            <span className="text-xs font-semibold text-gray-700">
                              {String(f.importes[c.campo] ?? '').trim()
                                ? formatEuros(parseImporte(f.importes[c.campo]))
                                : '—'}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right align-top">
                        <span className="inline-flex items-center justify-end gap-1 text-sm font-black text-gray-900">
                          <Euro className="w-3.5 h-3.5 text-cyan-600" />
                          {formatEuros(total)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        {pendiente.prendas ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700"
                            title={
                              pendiente.euros
                                ? `${pendiente.prendas} prendas entregadas sin pagar (${formatEuros(pendiente.euros)})`
                                : `${pendiente.prendas} prendas entregadas sin pagar (falta precio en el catálogo)`
                            }
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {pendiente.prendas} ud.
                            {pendiente.euros ? ` · ${formatEuros(pendiente.euros)}` : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>

            {filasVisibles.length > 0 && (
              <tbody>
                <tr className="bg-gray-900 text-white border-t-2 border-gray-700 font-bold">
                  <td className="px-4 py-2.5 text-xs font-black uppercase tracking-wide">
                    Total general
                    <span className="ml-2 font-semibold text-gray-400 normal-case tracking-normal">
                      {filasVisibles.length} jugadores
                    </span>
                  </td>
                  {CAMPOS.map(c => (
                    <td key={c.campo} className="px-3 py-2.5 text-right text-sm font-black">
                      {formatEuros(totales[c.campo])}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right text-sm font-black">{formatEuros(totales.total)}</td>
                  <td className="px-3 py-2.5 text-[11px] font-semibold text-amber-300">
                    {pendienteCobro.prendas
                      ? `${pendienteCobro.prendas} ud. sin pagar${pendienteCobro.euros ? ` · ${formatEuros(pendienteCobro.euros)}` : ''}`
                      : 'Al día'}
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>

      <p className="text-[11px] text-gray-400">
        Solo el rol <span className="font-semibold text-gray-500">Caja</span> (y el administrador) ve
        esta hoja. La columna <span className="font-semibold text-gray-500">Entregado sin pagar</span>{' '}
        sale de la hoja de vestuario: prendas marcadas como entregadas cuyo icono de dinero sigue en
        gris. El importe lo cobra caja y lo marca como pagado en{' '}
        <span className="font-semibold text-gray-500">Vestuario</span>.
      </p>

      {puedeEditar && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
          <span className="text-sm text-gray-500">
            {pendientes.length
              ? `${pendientes.length} ficha${pendientes.length > 1 ? 's' : ''} sin guardar`
              : 'Todo guardado. Las filas resaltadas tienen importes sin guardar.'}
          </span>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || !pendientes.length}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
};
