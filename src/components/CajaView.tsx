import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useClub } from '../context/ClubContext';
import { CajaJugador, Jugador, PagoCaja, VestuarioTipo } from '../types';
import { Wallet, Save, Euro, AlertTriangle, Lock } from 'lucide-react';
import {
  CAMPOS,
  CampoImporte,
  CajaDefaults,
  METODOS_PAGO,
  cajaService,
  cobradoDe,
  cobroDe,
  defaultsDe,
  estadoDe,
  faltanteDe,
  formatEuros,
  parseImporte,
  pagoDe,
  pendienteCobroDe,
  totalDe
} from '../services/caja';
import { fechaCorta, hoyISO, precioDe } from '../services/vestuario';

const INPUT_IMPORTE =
  'w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm font-semibold text-gray-900 ' +
  'text-right focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 placeholder:text-gray-300 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500';

const INPUT_PEQUENO =
  'w-full rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-900 ' +
  'focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-200 placeholder:text-gray-300 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500';

const INPUT_FILTRO =
  'rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 ' +
  'focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 placeholder:text-gray-300';

interface FilaTabla {
  jugador: Jugador;
  importes: Partial<CajaJugador>;
  sucia: boolean;
}

/** Casilla de un apartado: importe, casilla de pagado, día, tipo de pago y cobro fraccionado. */
const CeldaPago: React.FC<{
  jugador: string;
  concepto: string;
  deuda: string;
  pago: PagoCaja;
  editable: boolean;
  onDeuda: (valor: string) => void;
  onPago: (cambios: Partial<PagoCaja>) => void;
}> = ({ jugador, concepto, deuda, pago, editable, onDeuda, onPago }) => {
  const deudaNum = parseImporte(deuda);
  const estado = estadoDe(deudaNum, pago);
  const cobrado = cobradoDe(deudaNum, pago);
  const faltante = faltanteDe(deudaNum, pago);
  const anillo =
    estado === 'pagado'
      ? 'border-emerald-300 bg-emerald-50/70'
      : estado === 'parcial'
        ? 'border-amber-300 bg-amber-50/70'
        : 'border-gray-200 bg-white';

  const etiqueta = (texto: string, tono: string) => (
    <span className={`block text-right text-[10px] font-black ${tono}`}>{texto}</span>
  );

  if (!editable) {
    const metodo = METODOS_PAGO.find(m => m.valor === String(pago.metodo || ''));
    return (
      <div className={`space-y-0.5 rounded-xl border p-2 ${anillo}`}>
        <span className="block text-right text-xs font-bold text-gray-900">
          {deudaNum ? formatEuros(deudaNum) : '—'}
        </span>
        <span className="block text-[11px] text-gray-500">{metodo?.label || 'Sin método'}</span>
        <span className="block text-[11px] text-gray-500">
          {(pago.fecha || '').trim() ? `Pagado el ${fechaCorta(pago.fecha)}` : 'Sin día'}
        </span>
        {estado === 'parcial' &&
          etiqueta(
            faltante > 0 ? `Faltan ${formatEuros(faltante)}` : `Cobrado ${formatEuros(cobrado)}`,
            'text-amber-600'
          )}
        {estado === 'pagado' && etiqueta('Pagado ✓', 'text-emerald-600')}
        {estado === 'pendiente' && (
          <span className="block text-right text-[10px] font-bold text-gray-400">Pendiente</span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 rounded-xl border p-2 transition-colors ${anillo}`}>
      <input
        type="text"
        inputMode="decimal"
        className={INPUT_IMPORTE}
        value={deuda}
        placeholder="0"
        aria-label={`${concepto} de ${jugador} (importe)`}
        onChange={e => onDeuda(e.target.value)}
      />
      <div className="flex items-center gap-1.5">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
          checked={!!pago.pagado}
          title="Marcar el apartado como pagado"
          aria-label={`Pagado: ${concepto} de ${jugador}`}
          onChange={e =>
            onPago(
              e.target.checked
                ? { pagado: true, fecha: (pago.fecha || '').trim() || hoyISO() }
                : { pagado: false }
            )
          }
        />
        <input
          type="date"
          className={`${INPUT_PEQUENO} min-w-0 flex-1`}
          value={String(pago.fecha || '')}
          aria-label={`Día del pago de ${concepto} de ${jugador}`}
          onChange={e => onPago({ fecha: e.target.value })}
        />
      </div>
      <select
        className={INPUT_PEQUENO}
        value={String(pago.metodo || '')}
        aria-label={`Tipo de pago de ${concepto} de ${jugador}`}
        onChange={e => onPago({ metodo: e.target.value as PagoCaja['metodo'] })}
      >
        <option value="">Método de pago…</option>
        {METODOS_PAGO.map(m => (
          <option key={m.valor} value={m.valor}>
            {m.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        inputMode="decimal"
        className={INPUT_PEQUENO}
        value={String(pago.importe ?? '')}
        placeholder="Cobrado €"
        title="Importe cobrado hasta la fecha (admite pagos fraccionados)"
        aria-label={`Importe cobrado de ${concepto} de ${jugador}`}
        onChange={e => onPago({ importe: e.target.value })}
      />
      {estado === 'parcial' &&
        etiqueta(
          faltante > 0 ? `Faltan ${formatEuros(faltante)}` : `Cobrado ${formatEuros(cobrado)}`,
          'text-amber-600'
        )}
      {estado === 'pagado' && etiqueta('Pagado ✓', 'text-emerald-600')}
    </div>
  );
};

export const CajaView: React.FC = () => {
  const {
    jugadores,
    equipos,
    vestuario,
    vestuarioTipos,
    saveVestuarioTipo,
    saveCajaDefaults,
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
  const [defsDraft, setDefsDraft] = useState<CajaDefaults | null>(null);
  const [guardandoDefs, setGuardandoDefs] = useState(false);

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

  // ---------------------------------------------------- Importes por defecto
  const defaults: CajaDefaults = defaultsDe(clubConfig);
  const defs: CajaDefaults = defsDraft ?? defaults;
  const defsSucios = CAMPOS.some(c => defs[c.campo] !== defaults[c.campo]);

  const guardarDefaults = async () => {
    if (guardandoDefs || !defsSucios) return;
    setGuardandoDefs(true);
    try {
      if (await saveCajaDefaults(defs)) setDefsDraft(null);
    } finally {
      setGuardandoDefs(false);
    }
  };

  const filaDe = (j: Jugador): Partial<CajaJugador> => {
    const guardada = filaGuardada(j.id);
    const d = draft[j.id] || {};
    const merged: Partial<CajaJugador> = { ...guardada, ...d };
    // Filas todavía sin importe → se muestran los importes por defecto del club
    // (se guardan al tocar cualquier casilla de la fila).
    for (const c of CAMPOS) {
      if (!(c.campo in d) && !String(guardada[c.campo] ?? '').trim() && defaults[c.campo]) {
        merged[c.campo] = defaults[c.campo];
      }
    }
    return merged;
  };

  const sucia = (j: Jugador): boolean => {
    const b = filaGuardada(j.id);
    const d = draft[j.id];
    if (!d) return false;
    const importesIguales = CAMPOS.every(c => String(d[c.campo] ?? '') === String(b[c.campo] ?? ''));
    const pagosIguales = JSON.stringify(d.pagos ?? {}) === JSON.stringify(b.pagos ?? {});
    return !importesIguales || !pagosIguales;
  };

  const setImporte = (jugadorId: string, campo: CampoImporte, valor: string) =>
    setDraft(prev => ({ ...prev, [jugadorId]: { ...prev[jugadorId], [campo]: valor } }));

  /** Cambia el cobro (pagado, método, día o importe fraccionado) de un apartado. */
  const setPago = (jugadorId: string, campo: CampoImporte, cambios: Partial<PagoCaja>) =>
    setDraft(prev => {
      const actual: Partial<CajaJugador> = { ...prev[jugadorId] };
      const base: Partial<Record<CampoImporte, PagoCaja>> = {
        ...(filaGuardada(jugadorId).pagos || {}),
        ...(actual.pagos || {})
      };
      return {
        ...prev,
        [jugadorId]: {
          ...actual,
          pagos: { ...base, [campo]: { ...base[campo], ...cambios } }
        }
      };
    });

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
  }, [jugadores, equipoSel, busqueda, draft, filas, clubConfig]);

  const pendientes = filasVisibles.filter(f => f.sucia);

  /** Suma de cada columna sobre lo que se ve en pantalla (y cobro total). */
  const totales = useMemo(() => {
    const t: Record<CampoImporte, number> = {
      matricula: 0,
      temporada: 0,
      ropaNuevo: 0,
      ropaRenovacion: 0
    };
    const cobrados: Record<CampoImporte, number> = {
      matricula: 0,
      temporada: 0,
      ropaNuevo: 0,
      ropaRenovacion: 0
    };
    let cobrado = 0;
    let faltante = 0;
    for (const f of filasVisibles) {
      for (const c of CAMPOS) {
        const deuda = parseImporte(f.importes[c.campo]);
        const pago = pagoDe(f.importes, c.campo);
        t[c.campo] += deuda;
        cobrados[c.campo] += cobradoDe(deuda, pago);
      }
      const co = cobroDe(f.importes);
      cobrado += co.cobrado;
      faltante += co.faltante;
    }
    return {
      ...t,
      cobrados,
      cobrado,
      faltante,
      total: t.matricula + t.temporada + t.ropaNuevo + t.ropaRenovacion
    };
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
          pagos: f.importes.pagos || {},
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

  // ------------------------------------------------------- Importes por defecto
  const bloqueDefaults = (
    <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black font-athletic text-gray-900">Importes por defecto</h2>
          <p className="text-xs text-gray-500">
            Rellenan las casillas vacías de matrícula, temporada y ropa; después cada casilla se
            puede editar a mano.{puedeEditar ? '' : ' Solo el rol Caja puede modificarlo.'}
          </p>
        </div>
        {puedeEditar && (
          <button
            type="button"
            onClick={guardarDefaults}
            disabled={guardandoDefs || !defsSucios}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            {guardandoDefs ? 'Guardando…' : 'Guardar importes'}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {CAMPOS.map(c => (
          <label
            key={c.campo}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5"
          >
            <span className="text-sm font-semibold text-gray-700">{c.label}</span>
            <Euro className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              inputMode="decimal"
              className="w-20 bg-transparent text-sm font-bold text-gray-900 focus:outline-none placeholder:font-normal placeholder:text-gray-300 disabled:cursor-not-allowed"
              value={defs[c.campo]}
              disabled={!puedeEditar}
              placeholder="0"
              aria-label={`Importe por defecto de ${c.label}`}
              onChange={e => setDefsDraft({ ...defs, [c.campo]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </div>
  );

  // ------------------------------------------------------------------- Tabla
  const columnas = 7;
  let ultimoEquipo = '';

  return (
    <div className="space-y-5">
      {cabecera}
      <div className="grid gap-5 lg:grid-cols-2">
        {bloquePrecios}
        {bloqueDefaults}
      </div>

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
          <table className="w-full min-w-[1320px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Jugador</th>
                {CAMPOS.map(c => (
                  <th key={c.campo} className="px-2 py-3 text-center align-bottom min-w-[176px]">
                    {c.label}
                    {defaults[c.campo] && (
                      <span className="block text-[10px] font-semibold normal-case text-gray-400">
                        por defecto {formatEuros(parseImporte(defaults[c.campo]))}
                      </span>
                    )}
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
                const filaCobro = cobroDe(f.importes);
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
                        <td key={c.campo} className="px-2 py-2 align-top">
                          <CeldaPago
                            jugador={j.nombre}
                            concepto={c.label}
                            deuda={String(f.importes[c.campo] ?? '')}
                            pago={pagoDe(f.importes, c.campo)}
                            editable={puedeEditar}
                            onDeuda={valor => setImporte(j.id, c.campo, valor)}
                            onPago={cambios => setPago(j.id, c.campo, cambios)}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right align-top">
                        <span className="inline-flex items-center justify-end gap-1 text-sm font-black text-gray-900">
                          <Euro className="w-3.5 h-3.5 text-cyan-600" />
                          {formatEuros(total)}
                        </span>
                        {filaCobro.cobrado > 0 && (
                          <span
                            className={`block text-[11px] font-bold ${
                              filaCobro.faltante > 0 ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {filaCobro.faltante > 0
                              ? `Faltan ${formatEuros(filaCobro.faltante)}`
                              : `Cobrado ${formatEuros(filaCobro.cobrado)}`}
                          </span>
                        )}
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
                    <td key={c.campo} className="px-2 py-2.5 text-right">
                      <span className="block text-sm font-black">{formatEuros(totales[c.campo])}</span>
                      {totales.cobrados[c.campo] > 0 && (
                        <span className="block text-[10px] font-semibold text-emerald-300">
                          cobrado {formatEuros(totales.cobrados[c.campo])}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right text-sm font-black">{formatEuros(totales.total)}</td>
                  <td className="px-3 py-2.5 text-[11px] font-semibold text-amber-300">
                    {pendienteCobro.prendas
                      ? `${pendienteCobro.prendas} ud. sin pagar${pendienteCobro.euros ? ` · ${formatEuros(pendienteCobro.euros)}` : ''}`
                      : 'Al día'}
                    <span className="block text-emerald-300">
                      Cobrado {formatEuros(totales.cobrado)}
                      {totales.faltante > 0 ? ` · Pendiente ${formatEuros(totales.faltante)}` : ''}
                    </span>
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>

      <p className="text-[11px] text-gray-400">
        Solo el rol <span className="font-semibold text-gray-500">Caja</span> (y el administrador) ve
        esta hoja. Cada apartado (matrícula, temporada y ropa) tiene su{' '}
        <span className="font-semibold text-gray-500">tipo de pago</span> (efectivo, transferencia o
        tarjeta), la casilla de <span className="font-semibold text-gray-500">pagado</span> con su
        día y el importe cobrado para{' '}
        <span className="font-semibold text-gray-500">pagos fraccionados</span> (el borde se pone
        ámbar mientras falte dinero y verde cuando esté cobrado). Los importes por defecto se
        aplican a las casillas vacías. La columna{' '}
        <span className="font-semibold text-gray-500">Entregado sin pagar</span> sale de la hoja de
        vestuario.
      </p>

      {puedeEditar && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
          <span className="text-sm text-gray-500">
            {pendientes.length
              ? `${pendientes.length} ficha${pendientes.length > 1 ? 's' : ''} sin guardar`
              : 'Todo guardado. Las filas resaltadas tienen importes o cobros sin guardar.'}
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
