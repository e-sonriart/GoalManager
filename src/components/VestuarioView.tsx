import React, { useEffect, useMemo, useState } from 'react';
import { useClub } from '../context/ClubContext';
import { FilaVestuario, Jugador, VestuarioTipo } from '../types';
import {
  Shirt,
  Plus,
  Trash2,
  Save,
  Ruler,
  Lock,
  BellRing,
  CalendarClock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Modal } from './Modal';
import { sendNotify } from '../services/notifications';
import { vestuarioCerrado, formatFechaLimite, tallasDePrenda } from '../services/vestuario';

/** Opciones de talla por defecto (si la prenda no define sus propias tallas). */
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

const hoyISO = (): string => new Date().toISOString().slice(0, 10);

export const VestuarioView: React.FC = () => {
  const {
    jugadores,
    equipos,
    vestuario,
    vestuarioTipos,
    saveHojaVestuario,
    saveVestuarioTipo,
    deleteVestuarioTipo,
    saveVestuarioFechaLimite,
    clubConfig,
    jugadorActual,
    can,
    addToast
  } = useClub();

  const canManage = can('manage:vestuario');
  const fechaLimite = (clubConfig?.vestuarioFechaLimite || '').trim();
  const plazoCerrado = vestuarioCerrado(fechaLimite);

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
  const [nuevasTallas, setNuevasTallas] = useState('');
  const [tipoDraft, setTipoDraft] = useState<Record<string, { nombre: string; tallasDisponibles: string }>>({});
  const [fechaDraft, setFechaDraft] = useState(fechaLimite);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyEnviando, setNotifyEnviando] = useState<string | null>(null);

  useEffect(() => {
    setFechaDraft(fechaLimite);
  }, [fechaLimite]);

  const prendas = useMemo(
    () =>
      [...vestuarioTipos]
        .filter(t => t.activo !== false)
        .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0) || a.nombre.localeCompare(b.nombre, 'es')),
    [vestuarioTipos]
  );
  const nombresPrendas = prendas.map(p => p.nombre);

  /** Opciones de talla de una prenda (las define el rol vestuario). */
  const opcionesDe = (p: VestuarioTipo, actual?: string): string[] => {
    const base = tallasDePrenda(p, TALLAS_PRESET);
    return actual && !base.includes(actual) ? [actual, ...base] : base;
  };

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

  /** Rojo: le faltan datos. Verde: ya lo tiene pedido. */
  const estaCompleto = (j: Jugador): boolean => {
    const row = rowOf(j);
    if (!(row.nombreCamiseta || '').trim()) return false;
    return prendas.every(p => (row.tallas?.[p.nombre] || '').trim());
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
  const incompletos = filasVisibles.filter(j => !estaCompleto(j));
  const completos = filasVisibles.filter(j => estaCompleto(j));

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
    const ok = await saveVestuarioTipo({
      nombre: nuevaPrenda,
      tallasDisponibles: nuevasTallas
    });
    if (ok) {
      setNuevaPrenda('');
      setNuevasTallas('');
    }
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

  const guardarTipo = async (tipo: VestuarioTipo) => {
    const d = tipoDraft[tipo.id];
    if (!d) return;
    const ok = await saveVestuarioTipo({
      id: tipo.id,
      nombre: d.nombre,
      tallasDisponibles: d.tallasDisponibles,
      orden: tipo.orden
    });
    if (ok) setTipoDraft(prev => {
      const next = { ...prev };
      delete next[tipo.id];
      return next;
    });
  };

  const tipoSucio = (tipo: VestuarioTipo): boolean => {
    const d = tipoDraft[tipo.id];
    if (!d) return false;
    return (
      d.nombre.trim() !== (tipo.nombre || '') ||
      d.tallasDisponibles.trim() !== (tipo.tallasDisponibles || '').trim()
    );
  };

  const guardarFechaLimite = async () => {
    await saveVestuarioFechaLimite(fechaDraft);
  };

  /** Envía el aviso push a los jugadores indicados de la lista filtrada. */
  const notificar = async (tipo: 'faltan' | 'listo', ids: string[]) => {
    if (notifyEnviando || !ids.length) return;
    setNotifyEnviando(tipo);
    try {
      const limite = fechaLimite ? ` (hasta el ${formatFechaLimite(fechaLimite)})` : '';
      const res =
        tipo === 'faltan'
          ? await sendNotify({
              tipo: 'vestuario_faltan',
              refId: `vestuario_faltan_${hoyISO()}`,
              jugadorIds: ids,
              titulo: 'Te faltan tus tallas de vestuario',
              cuerpo: `Completa el nombre de tu camiseta y las tallas de cada prenda desde la pestaña Vestuario${limite}.`,
              url: '/?tab=vestuario',
              soloJugadores: true
            })
          : await sendNotify({
              tipo: 'vestuario_listo',
              refId: `vestuario_listo_${hoyISO()}`,
              jugadorIds: ids,
              titulo: 'Tu pedido de vestuario está listo',
              cuerpo: 'Ya puedes pasar a recoger tu equipación. Si algo no cuadra, avísale al vestuario.',
              url: '/?tab=vestuario',
              soloJugadores: true
            });
      if (res.notified === 0) {
        addToast({
          type: 'info',
          title: 'Ya estaba notificado',
          message: 'Este aviso ya se envió hoy a esos jugadores.'
        });
      } else {
        addToast({
          type: 'success',
          title: 'Aviso enviado',
          message: `${res.notified} jugador${res.notified === 1 ? '' : 'es'} avisado${res.notified === 1 ? '' : 's'}${res.sent ? ` y llegado a ${res.sent} dispositivo${res.sent === 1 ? '' : 's'}` : ''}.`
        });
      }
      setNotifyOpen(false);
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo enviar la notificación.' });
    } finally {
      setNotifyEnviando(null);
    }
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
              ? 'Gestiona prendas, tallas disponibles, fecha límite y avisos de la plantilla.'
              : soyJugador
                ? 'Indica tus tallas y los datos impresos en tu camiseta.'
                : 'Consulta de tallas y de nombre/número de camiseta de la plantilla.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canManage && (
          <button
            type="button"
            onClick={() => setNotifyOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <BellRing className="w-4 h-4" />
            Notificar
          </button>
        )}
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
    const completo = estaCompleto(jugadorActual);
    return (
      <div className="space-y-5">
        {cabecera}

        {fechaLimite && (
          <div
            className={`flex items-start gap-2.5 rounded-2xl border p-4 text-sm ${
              plazoCerrado
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <CalendarClock className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              {plazoCerrado ? (
                <>
                  <strong>Plazo cerrado.</strong> La fecha límite era el{' '}
                  {formatFechaLimite(fechaLimite)}: ya no puedes modificar tus tallas ni el nombre de
                  la camiseta.
                </>
              ) : (
                <>
                  Tienes hasta el <strong>{formatFechaLimite(fechaLimite)}</strong> para modificar tus
                  tallas y el nombre de tu camiseta.
                </>
              )}
            </p>
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-gray-900">
              <Ruler className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-black font-athletic">Mi pedido</h2>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                completo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}
            >
              {completo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {completo ? 'Pedido completo' : 'Faltan datos'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Nombre en la espalda
              </span>
              <input
                type="text"
                className={`${INPUT_TEXTO} w-full disabled:bg-gray-100 disabled:text-gray-400`}
                value={fila.nombreCamiseta || ''}
                placeholder="Ej: MARTÍNEZ"
                disabled={plazoCerrado}
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
                className={`${INPUT_TEXTO} w-full disabled:bg-gray-100 disabled:text-gray-400`}
                value={fila.numeroCamiseta || ''}
                placeholder="Ej: 10"
                disabled={plazoCerrado}
                onChange={e => setNumeroCamiseta(jugadorActual.id, e.target.value.replace(/\D/g, ''))}
              />
            </label>
          </div>

          <div className="space-y-3">
            {prendas.map(p => {
              const actual = fila.tallas?.[p.nombre] || '';
              return (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-gray-150 bg-gray-50/60 px-4 py-3"
                >
                  <span className="text-sm font-bold text-gray-800">{p.nombre}</span>
                  <select
                    className={`${INPUT_TALLA} w-full sm:w-32 disabled:bg-gray-100 disabled:text-gray-400`}
                    value={actual}
                    disabled={plazoCerrado}
                    onChange={e => setTalla(jugadorActual.id, p.nombre, e.target.value)}
                  >
                    <option value="">Sin talla</option>
                    {opcionesDe(p, actual).map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
            {!prendas.length && (
              <p className="text-sm text-gray-400">
                Aún no hay prendas: el club publicará el catálogo pronto.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={guardar}
            disabled={saving || !cambios || plazoCerrado}
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
        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black font-athletic text-gray-900">Prendas del club</h2>
              <p className="text-xs text-gray-500">
                Cada prenda define sus propias tallas: son las que el jugador podrá elegir.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <label className="block space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
                  Fecha límite de los jugadores
                </span>
                <input
                  type="date"
                  className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-amber-400 focus:outline-none"
                  value={fechaDraft}
                  onChange={e => setFechaDraft(e.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={guardarFechaLimite}
                disabled={fechaDraft === fechaLimite}
                className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
              >
                Guardar
              </button>
              {fechaLimite && (
                <span
                  className={`text-[11px] font-bold ${plazoCerrado ? 'text-red-600' : 'text-emerald-700'}`}
                >
                  {plazoCerrado
                    ? `Cerrado desde ${formatFechaLimite(fechaLimite)}`
                    : `Abierto hasta ${formatFechaLimite(fechaLimite)}`}
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-150 rounded-2xl overflow-hidden">
            {prendas.map(p => {
              const d = tipoDraft[p.id] || {
                nombre: p.nombre,
                tallasDisponibles: p.tallasDisponibles || ''
              };
              const sucio = tipoSucio(p);
              return (
                <div
                  key={p.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 px-3.5 py-3 ${sucio ? 'bg-orange-50/60' : 'bg-white'}`}
                >
                  <input
                    type="text"
                    className={`${INPUT_TEXTO} sm:w-56`}
                    value={d.nombre}
                    onChange={e =>
                      setTipoDraft(prev => ({
                        ...prev,
                        [p.id]: { ...d, nombre: e.target.value }
                      }))
                    }
                  />
                  <input
                    type="text"
                    className={`${INPUT_TEXTO} flex-1`}
                    value={d.tallasDisponibles}
                    placeholder="Tallas disponibles, separadas por comas (S, M, L, XL)"
                    onChange={e =>
                      setTipoDraft(prev => ({
                        ...prev,
                        [p.id]: { ...d, tallasDisponibles: e.target.value }
                      }))
                    }
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Guardar prenda"
                      onClick={() => guardarTipo(p)}
                      disabled={!sucio || !d.nombre.trim()}
                      className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-gray-700 disabled:opacity-30"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      title={`Quitar ${p.nombre}`}
                      onClick={() => quitarPrenda(p.id, p.nombre)}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {!prendas.length && (
              <p className="px-3.5 py-3 text-sm text-gray-400">
                Sin prendas todavía. Añade la primera o ejecuta <code className="font-mono">vestuario.sql</code>.
              </p>
            )}
          </div>

          <form onSubmit={añadirPrenda} className="flex flex-wrap items-end gap-2">
            <label className="block space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Prenda</span>
              <input
                type="text"
                className={`${INPUT_TEXTO} w-48`}
                value={nuevaPrenda}
                placeholder="Ej: Media alta"
                onChange={e => setNuevaPrenda(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Tallas</span>
              <input
                type="text"
                className={`${INPUT_TEXTO} w-64`}
                value={nuevasTallas}
                placeholder="S, M, L, XL"
                onChange={e => setNuevasTallas(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-600 px-2.5 py-1 text-xs font-bold">
          {incompletos.length} sin datos
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-bold">
          {completos.length} pedidos
        </span>
        {!canManage && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400">
            <Lock className="w-3.5 h-3.5" /> Solo lectura
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
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
                <th className="px-3 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filasVisibles.map(j => {
                const row = rowOf(j);
                const cambiada = filaCambiada(j);
                const completo = estaCompleto(j);
                return (
                  <tr key={j.id} className={cambiada ? 'bg-orange-50/60' : 'bg-white'}>
                    <td className="px-4 py-2.5 font-semibold text-gray-900 whitespace-nowrap">
                      {j.nombre}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{j.equipo}</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        className={`${INPUT_TEXTO} w-36 disabled:bg-gray-50 disabled:text-gray-600`}
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
                        className={`${INPUT_TEXTO} w-16 disabled:bg-gray-50 disabled:text-gray-600`}
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
                            list={`tallas-${p.id}`}
                            className={INPUT_TALLA}
                            value={row.tallas?.[p.nombre] || ''}
                            placeholder="—"
                            onChange={e => setTalla(j.id, p.nombre, e.target.value)}
                          />
                        ) : (
                          <span
                            className={`inline-block rounded-lg px-2 py-1 text-xs font-bold ${
                              row.tallas?.[p.nombre] ? 'bg-gray-900 text-white' : 'text-gray-300'
                            }`}
                          >
                            {row.tallas?.[p.nombre] || '—'}
                          </span>
                        )}
                        <datalist id={`tallas-${p.id}`}>
                          {tallasDePrenda(p, TALLAS_PRESET).map(t => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
                      </td>
                    ))}
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          completo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}
                        title={
                          completo
                            ? 'Pedido completo: nombre y todas las tallas'
                            : 'Faltan datos por completar'
                        }
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${completo ? 'bg-emerald-500' : 'bg-red-500'}`}
                        />
                        {completo ? 'Verde: pedido' : 'Rojo: faltan'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!filasVisibles.length && (
                <tr>
                  <td colSpan={5 + prendas.length} className="px-4 py-10 text-center text-gray-400">
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

      {/* ---------------------------------------------------------- Notificar */}
      <Modal
        isOpen={notifyOpen}
        onClose={() => {
          if (!notifyEnviando) setNotifyOpen(false);
        }}
        title="Notificar a los jugadores"
        subtitle="Elige el aviso que quieres enviar por notificación push"
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => notificar('faltan', incompletos.map(j => j.id))}
            disabled={!incompletos.length || !!notifyEnviando}
            className="w-full text-left rounded-2xl border-2 border-red-200 bg-red-50 p-4 flex items-start gap-3 transition-all hover:border-red-400 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="p-2 rounded-xl bg-red-100 text-red-600 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-red-700">Faltan tus tallas</span>
              <span className="block text-sm text-red-700/80">
                Avisa a los {incompletos.length} que no tienen nombre o tallas completas
                {fechaLimite ? ` (plazo hasta el ${formatFechaLimite(fechaLimite)})` : ''}.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => notificar('listo', completos.map(j => j.id))}
            disabled={!completos.length || !!notifyEnviando}
            className="w-full text-left rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3 transition-all hover:border-emerald-400 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-emerald-700">Listo para recoger</span>
              <span className="block text-sm text-emerald-700/80">
                Avisa a los {completos.length} que ya tienen su pedido completo.
              </span>
            </span>
          </button>

          <p className="text-[11px] text-gray-400">
            {notifyEnviando
              ? 'Enviando…'
              : 'Los jugadores solo reciben el aviso una vez por día. Se envía a la lista filtrada actual.'}
          </p>
        </div>
      </Modal>
    </div>
  );
};
