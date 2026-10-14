#!/usr/bin/env node
/**
 * Extrae de FFCV los equipos de fútbol base de una provincia (por defecto Valencia)
 * y los sube a la tabla `ffcv_equipos` de Supabase.
 *
 * Unificación: una fila por (club + campo). Los equipos de un mismo club que
 * juegan en el mismo campo se fusionan en una sola fila; el mismo club con
 * campos distintos genera una fila por cada ubicación. No se almacena el
 * nombre del equipo (la columna `nombre` se eliminó) ni la `categoria`
 * (esta última solo se usa como filtro).
 *
 * Fuentes FFCV:
 *  1) api/clubes/ajax_clubes.php?nclub=%        -> listado de clubes (nombre, escudo, localidad, provincia)
 *  2) api/clubes/ajax_club_equipos.php          -> equipos de cada club (nombre, categoría, campo)
 *  3) api/instalaciones/datos_campo.php         -> dirección, CP, localidad, provincia, lat/lng del campo
 *
 * Uso:
 *   node scripts/ffcv-equipos.mjs                 # extrae, unifica y sube a Supabase
 *   node scripts/ffcv-equipos.mjs --dry-run       # solo extrae, no sube ni borra
 *   node scripts/ffcv-equipos.mjs --sql           # además escribe ffcv_equipos_data_*.sql
 *   node scripts/ffcv-equipos.mjs --todas-categorias
 *   node scripts/ffcv-equipos.mjs --provincia=Alicante
 *   node scripts/ffcv-equipos.mjs --limite=10     # prueba con 10 clubes
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://ffcv.es/competiciones/api';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Categorías de fútbol base (prebenjamín .. juvenil, incluye valenta/futsal/playa base)
const BASE_RE = /prebenjam|benjam|alev[ií]n|infantil|cadet|juvenil|querubin/i;

// Máximo por fichero SQL: el SQL Editor de Supabase corta los pegados grandes
const MAX_SQL_BYTES = 200_000;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, def = '') => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};

const DRY_RUN = flag('dry-run');
const GEN_SQL = flag('sql');
const TODAS = flag('todas-categorias');
const FORCE = flag('force');
const LIMITE = Number(opt('limite', '0')) || 0;
const PROVINCIA = opt('provincia', 'Valencia');
// Solo estos clubes (separados por |): útil para añadir clubes concretos
const SOLO_CLUBES = opt('clubes', '')
  .split('|')
  .map((s) => s.trim())
  .filter(Boolean);


function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

/**
 * GET con reintentos. La API de FFCV puede responder con `sesion_ok: 0`
 * (mantenimiento / sesión no iniciada) o 502 "refresco": en esos casos
 * espera más y vuelve a probar antes de rendirse.
 */
async function getJson(url, tries = 6) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json,*/*', Referer: 'https://ffcv.es/competiciones/' }
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      // Respuesta de sesión vacía: la API aún no nos ha "abierto" la petición
      if (data && data.sesion_ok === '0' && !Array.isArray(data.clubes) && !Array.isArray(data.equipos)) {
        throw new Error('sesion_ok=0 (FFCV en refresco)');
      }
      if (data && data.estado === '0' && data.error) throw new Error(data.error);
      return data;
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/**
 * Normaliza el escudo a una URL descargable.
 * FFCV devuelve rutas relativas (/pnfg/...) que NO existen en ffcv.es:
 * el HTML oficial las prefija con https://appwebffcv.novanet.es (baseLogo).
 * También admite data URLs y base64 "puro" (mismo criterio que toImgSrc de FFCV).
 */
const IMG_BASE = 'https://appwebffcv.novanet.es';

const absUrl = (u) => {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^data:image\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (/^https?:\/\//i.test(s)) {
    // ffcv.es no sirve /pnfg/... (404): el mismo fichero vive en novanet
    if (/^https?:\/\/(www\.)?ffcv\.es\/pnfg\//i.test(s)) {
      return IMG_BASE + s.replace(/^https?:\/\/(www\.)?ffcv\.es/i, '');
    }
    return s;
  }
  if (!/^[a-z]+:\/\//i.test(s) && /^[A-Za-z0-9+/=]+$/.test(s) && s.length > 100) {
    return `data:image/jpeg;base64,${s}`;
  }
  return `${IMG_BASE}${s.startsWith('/') ? '' : '/'}${s}`;
};

const numOrNull = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : null;
};

/**
 * Clave de comparación sin acentos, mayúsculas, espacios ni puntuación:
 * 'U.D. CASTELLONENSE 'B'' y 'U.D.CASTELLONENSE 'B'' -> la misma clave.
 */
const normKey = (s) => norm(s).replace(/[^a-z0-9]+/g, '');

/** id determinista por (club, campo): mismo club+campo -> misma fila entre corridas */
const makeId = (club, key) => {
  const slug =
    norm(club)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'club';
  const hash = crypto.createHash('sha1').update(key).digest('hex').slice(0, 12);
  return `${slug}-${hash}`;
};

/** Nombre de club a mostrar entre las variantes fusionadas (prioriza sin errata de espacios) */
const pickClub = (variantes) =>
  [...variantes].sort(
    (a, b) => (/'\s/.test(a) ? 1 : 0) - (/'\s/.test(b) ? 1 : 0) || a.localeCompare(b)
  )[0];

/** Rellena en la fila los datos del campo (dirección, CP, coords) */
function fillCampo(row, campo) {
  row.campo = campo.nombre || row.campo;
  row.direccion = campo.direccion || row.direccion;
  row.localidad = campo.localidad || row.localidad;
  row.provincia = campo.provincia || row.provincia;
  row.cp = campo.cp || row.cp;
  row.lat = campo.lat ?? row.lat;
  row.lng = campo.lng ?? row.lng;
}

/** 1) Todos los clubes (paginado con comodín %) y filtro por provincia */
async function fetchClubes() {
  const out = new Map();
  const size = 500;
  for (let page = 1; page <= 50; page++) {
    const data = await getJson(
      `${BASE}/clubes/ajax_clubes.php?nclub=%25&NPcd_PageLines=${size}&NPcd_Page=${page}`
    );
    const list = Array.isArray(data?.clubes) ? data.clubes : [];
    for (const c of list) {
      const cod = String(c?.codigo_club || '').trim();
      if (cod) out.set(cod, c);
    }
    if (list.length < size) break;
  }
  const wanted = norm(PROVINCIA);
  const all = [...out.values()];
  const filtered = all.filter((c) => norm(c?.provincia) === wanted);
  console.log(`Clubes FFCV: ${all.length} | provincia ${PROVINCIA}: ${filtered.length}`);
  return filtered;
}

/** Equipos de un club con un concreto estilo de parámetros (pagina) */
async function fetchEquiposBy(qs) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const data = await getJson(
      `${BASE}/clubes/ajax_club_equipos.php?${qs}&NPcd_PageLines=500&NPcd_Page=${page}`
    );
    const list = Array.isArray(data?.equipos) ? data.equipos : [];
    out.push(...list);
    if (!list.length || !Number(data?.pagina_siguiente)) break;
  }
  return out;
}

/**
 * 2) Equipos de un club. La web oficial los pide con `clave=<clave_acceso>&
 * cod_temporada=`; la API también acepta `codigo_club=`. Se prueban ambas
 * variantes hasta obtener equipos.
 */
async function fetchEquiposClub(club) {
  const cod = String(club?.codigo_club || '').trim();
  const clave = String(club?.clave_acceso || '').trim();
  const variantes = [];
  if (cod) variantes.push(`codigo_club=${encodeURIComponent(cod)}`);
  if (clave) variantes.push(`clave=${encodeURIComponent(clave)}&cod_temporada=`);
  let lastErr = null;
  for (const qs of variantes) {
    try {
      const eqs = await fetchEquiposBy(qs);
      if (eqs.length) return eqs;
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return [];
}

/** 3) Ficha del campo -> dirección, localidad, CP, lat/lng */
async function fetchCampo(codigoCampo, cache) {
  const key = String(codigoCampo || '').trim();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);
  try {
    const d = await getJson(`${BASE}/instalaciones/datos_campo.php?codcampo=${key}`);
    if (String(d?.estado) !== '1') throw new Error('estado!=' + d?.estado);
    const campo = {
      nombre: String(d.nombre_campo || '').trim(),
      direccion: String(d.direccion || '').trim(),
      localidad: String(d.localidad || '').trim(),
      provincia: String(d.provincia || '').trim(),
      cp: String(d.codigo_postal || '').trim(),
      lat: numOrNull(d.latitud),
      lng: numOrNull(d.longitud)
    };
    cache.set(key, campo);
    return campo;
  } catch {
    cache.set(key, null);
    return null;
  }
}

function sqlEscape(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** Genera sentencias INSERT y las trocea en ficheros de como mucho MAX_SQL_BYTES */
function writeSqlFiles(rows, marker) {
  const cols = [
    'id', 'club', 'escudo', 'campo', 'codigo_campo',
    'direccion', 'localidad', 'provincia', 'cp', 'lat', 'lng', 'codigo_club', 'updated_at'
  ];
  const setClause =
    `on conflict (id) do update set\n` +
    cols.filter((c) => c !== 'id').map((c) => `  ${c} = excluded.${c}`).join(',\n') +
    ';';
  const head =
    '-- Datos extraídos de FFCV (scripts/ffcv-equipos.mjs)\n' +
    `-- Clubes de fútbol base, provincia de ${PROVINCIA} | una fila por club+campo\n` +
    '-- Ejecutar en orden. Cada fichero es autónomo.\n\n';

  const parts = [];
  let cur = '';
  for (let i = 0; i < rows.length; i += 100) {
    const values = rows
      .slice(i, i + 100)
      .map((r) => `(${cols.map((c) => sqlEscape(r[c])).join(', ')})`)
      .join(',\n');
    const stmt =
      `insert into ffcv_equipos (${cols.join(', ')}) values\n${values}\n${setClause}`;
    if (cur && Buffer.byteLength(cur + stmt, 'utf8') > MAX_SQL_BYTES) {
      parts.push(cur);
      cur = '';
    }
    cur += (cur ? '\n\n' : '') + stmt;
  }
  if (cur) parts.push(cur);

  // Al final: borra lo anterior a esta extracción (ids antiguos u obsoletos)
  parts[parts.length - 1] +=
    `\n\n-- Limpieza: elimina filas de corridas anteriores\n` +
    `delete from ffcv_equipos where updated_at < '${marker}';`;

  const digits = String(parts.length).length;
  const files = parts.map((body, i) => {
    const name = `ffcv_equipos_data_${String(i + 1).padStart(digits, '0')}.sql`;
    fs.writeFileSync(path.join(ROOT, name), head + body + '\n', 'utf8');
    return name;
  });
  return files;
}

/**
 * Columnas reales que existen en la tabla (null si la tabla está vacía).
 * Permite que el upsert funcione aunque queden columnas obsoletas en el
 * esquema (p. ej. `nombre`, todavía NOT NULL hasta que se elimine).
 */
async function getColumns() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const r = await fetch(`${url}/rest/v1/ffcv_equipos?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (r.status === 404) {
    throw new Error('Tabla ffcv_equipos no existe: ejecuta ffcv_equipos.sql en el SQL Editor');
  }
  if (!r.ok) return null;
  const data = await r.json();
  if (!Array.isArray(data) || !data.length) return null;
  return new Set(Object.keys(data[0]));
}

/** Nº de filas actuales en la tabla (para la salvaguarda anti-pérdida). */
async function countRows() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return 0;
  try {
    const r = await fetch(`${url}/rest/v1/ffcv_equipos?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' }
    });
    const cr = r.headers.get('content-range');
    const n = cr ? Number(cr.split('/')[1]) : NaN;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function upsertSupabase(rows) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env');
  const existing = await getColumns();
  const size = 500;
  let sent = 0;
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size).map((row) => {
      if (!existing) return row;
      const out = {};
      for (const [k, v] of Object.entries(row)) if (existing.has(k)) out[k] = v;
      // `nombre` sigue existiendo y es NOT NULL: se rellena con el club
      // hasta que se ejecute ffcv_equipos_drop_nombre.sql.
      if (existing.has('nombre') && !('nombre' in out)) out.nombre = row.club;
      return out;
    });
    const r = await fetch(`${url}/rest/v1/ffcv_equipos`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(chunk)
    });
    if (!r.ok) {
      const body = await r.text();
      if (r.status === 404) {
        throw new Error('Tabla ffcv_equipos no existe: ejecuta ffcv_equipos.sql en el SQL Editor');
      }
      throw new Error(`Supabase ${r.status}: ${body.slice(0, 300)}`);
    }
    sent += chunk.length;
    process.stdout.write(`\rSubidas: ${sent}/${rows.length}`);
  }
  process.stdout.write('\n');
}

/**
 * Borra las filas anteriores a esta corrida (ids antiguos por codequipo,
 * equipos que ya no existen, duplicados por categoría...).
 */
async function deleteStale(marker) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const base = `${url}/rest/v1/ffcv_equipos`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
  let total = 0;
  for (;;) {
    const r = await fetch(`${base}?updated_at=lt.${encodeURIComponent(marker)}&select=id&limit=1000`, {
      method: 'DELETE',
      headers
    });
    if (!r.ok) {
      console.warn(`Limpieza: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
      break;
    }
    const deleted = await r.json();
    total += deleted.length;
    if (deleted.length < 1000) break;
  }
  console.log(`Limpieza: ${total} filas obsoletas eliminadas`);
}

/**
 * Reescura en Supabase los escudos que aún apuntan a ffcv.es (404).
 * Cubre filas de corridas anteriores que este run no ha vuelto a tocar.
 */
async function fixBrokenShields() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const base = `${url}/rest/v1/ffcv_equipos`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };

  const stale = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(
      `${base}?select=id,escudo&escudo=like.*ffcv.es*&limit=1000&offset=${offset}`,
      { headers }
    );
    if (!r.ok) break;
    const batch = await r.json();
    stale.push(...batch);
    if (batch.length < 1000) break;
  }
  if (!stale.length) {
    console.log('Escudos: ninguno pendiente de corregir');
    return;
  }

  // Agrupa por valor actual para hacer un PATCH por URL (pocas URLs distintas)
  const byUrl = new Map();
  for (const row of stale) {
    const list = byUrl.get(row.escudo) || [];
    list.push(row.id);
    byUrl.set(row.escudo, list);
  }
  const now = new Date().toISOString();
  let fixed = 0;
  for (const [oldUrl, ids] of byUrl) {
    const nuevo = absUrl(oldUrl);
    const r = await fetch(`${base}?id=in.(${ids.join(',')})`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ escudo: nuevo, updated_at: now })
    });
    if (r.ok) fixed += ids.length;
    else console.warn(`  fix ${oldUrl} -> HTTP ${r.status}`);
  }
  console.log(`Escudos corregidos: ${fixed}/${stale.length} (de ffcv.es a ${IMG_BASE})`);
}

async function main() {
  loadEnv();
  console.log(`Extracción FFCV -> ffcv_equipos (${DRY_RUN ? 'dry-run' : 'subir'})`);

  let clubes = await fetchClubes();
  if (!clubes.length) {
    throw new Error(
      'La API de FFCV no devolvió clubes (¿mantenimiento o cambio de sesión?). No se sube nada.'
    );
  }
  if (SOLO_CLUBES.length) {
    const wanted = SOLO_CLUBES.map((s) => normKey(s));
    const antes = clubes.length;
    clubes = clubes.filter((c) => wanted.some((w) => normKey(c?.nombre || '').includes(w)));
    console.log(`(clubes pedidos: ${clubes.length} de ${antes})`);
    if (!clubes.length) throw new Error(`Ningún club coincide con: ${SOLO_CLUBES.join(', ')}`);
  }
  if (LIMITE) {
    clubes = clubes.slice(0, LIMITE);
    console.log(`(límite: ${clubes.length} clubes)`);
  }

  const fallidos = [];
  const porClub = await pool(clubes, 6, async (club) => {
    try {
      const eqs = await fetchEquiposClub(club);
      if (!eqs.length) fallidos.push(String(club.nombre || '').trim());
      return eqs;
    } catch (e) {
      fallidos.push(`${String(club.nombre || '').trim()} [${e.message}]`);
      return [];
    }
  });
  if (fallidos.length) {
    console.log(`Clubes sin equipos obtenidos: ${fallidos.length} -> ${fallidos.slice(0, 8).join(' | ')}`);
  }

  let equipos = porClub.flat();
  const totalBruto = equipos.length;
  if (!TODAS) equipos = equipos.filter((e) => BASE_RE.test(String(e?.categoria || '')));
  console.log(`Equipos: ${totalBruto} en bruto | ${equipos.length} de fútbol base`);

  const camposCache = new Map();
  const codigosCampo = [...new Set(equipos.map((e) => String(e?.codigo_campo || '').trim()).filter(Boolean))];
  await pool(codigosCampo, 8, (cod) => fetchCampo(cod, camposCache));
  console.log(`Campos consultados: ${codigosCampo.length}`);

  const now = new Date().toISOString();

  // Datos autoritativos del club (nombre y escudo) desde el listado FFCV
  const clubesByCod = new Map(clubes.map((c) => [String(c?.codigo_club || '').trim(), c]));

  // Unificación: una fila por (club, campo). El club se identifica por su
  // codigo_club (o, en su defecto, por su nombre normalizado) y el campo por
  // su codigo_campo (o por su nombre). Los equipos de un mismo club en el
  // mismo campo se fusionan; mismo club con campos distintos -> filas
  // separadas (una por ubicación). No se guarda el nombre del equipo.
  const byKey = new Map();

  const mergeInto = (target, src) => {
    for (const k of src._keys) {
      byKey.set(k, target);
      if (!target._keys.includes(k)) target._keys.push(k);
    }
    target._clubs.push(...src._clubs);
    if (!target.escudo && src.escudo) target.escudo = src.escudo;
    if (!target.codigo_campo && src.codigo_campo) target.codigo_campo = src.codigo_campo;
    if (!target.campo && src.campo) target.campo = src.campo;
    if (!target.direccion && src.direccion) target.direccion = src.direccion;
    if (!target.localidad && src.localidad) target.localidad = src.localidad;
    if (!target.cp && src.cp) target.cp = src.cp;
    if (target.lat === null && src.lat !== null) target.lat = src.lat;
    if (target.lng === null && src.lng !== null) target.lng = src.lng;
  };

  for (const e of equipos) {
    const codClub = String(e?.codigo_club || '').trim();
    const clubData = clubesByCod.get(codClub);
    const club = String(clubData?.nombre || e?.nombre_club || '').trim();
    if (!club) continue;
    const codCampo = String(e?.codigo_campo || '').trim();
    const campo = camposCache.get(codCampo) || null;
    const campoNombre = campo?.nombre || String(e?.campo_juego || '').trim();

    const clubId = codClub ? `k${codClub}` : `n${normKey(club)}`;
    const fieldCode = codCampo ? `c${codCampo}` : '';
    const fieldText = !codCampo && campoNombre ? `f${normKey(campoNombre)}` : '';

    // Claves primarias (código de club + código de campo) y alias de texto
    // (nombre de club + nombre de campo) para fusionar aunque falte un código.
    const keys = [];
    if (fieldCode) keys.push(`${clubId}|${fieldCode}`);
    if (fieldText) keys.push(`${clubId}|${fieldText}`);
    const nameAlias = `${normKey(club)}|${fieldCode || fieldText}`;
    if (keys.length) {
      if (!keys.includes(nameAlias)) keys.push(nameAlias);
    } else {
      keys.push(`${clubId}|`, `${normKey(club)}|`);
    }

    // Fila existente por código de campo (preferente) o por nombre de campo
    // (solo si no contradice un código distinto ya registrado).
    const hits = [];
    const seen = new Set();
    for (const k of keys) {
      const found = byKey.get(k);
      if (!found || seen.has(found)) continue;
      if (k === nameAlias && found.codigo_campo && codCampo && found.codigo_campo !== codCampo) continue;
      seen.add(found);
      hits.push(found);
    }

    const escudo = absUrl(clubData?.escudo || e?.escudo);
    let row = hits[0];
    if (row) {
      for (const other of hits.slice(1)) mergeInto(row, other);
      if (!row.escudo) row.escudo = escudo;
      if (!row.codigo_campo && codCampo) row.codigo_campo = codCampo;
      if (!row.campo) row.campo = campoNombre;
      if (campo) fillCampo(row, campo);
      row._clubs.push(club);
    } else {
      row = {
        club,
        escudo,
        campo: campoNombre,
        codigo_campo: codCampo || null,
        direccion: '',
        localidad: '',
        provincia: PROVINCIA,
        cp: '',
        lat: null,
        lng: null,
        codigo_club: codClub || null,
        updated_at: now,
        _clubs: [club],
        _keys: []
      };
      if (campo) fillCampo(row, campo);
    }

    for (const k of keys) {
      // Ninguna clave puede robarse a otra fila con un código distinto:
      // solo se toma si está libre o ya es de esta fila.
      if (byKey.has(k) && byKey.get(k) !== row) continue;
      byKey.set(k, row);
      if (!row._keys.includes(k)) row._keys.push(k);
    }
  }

  const rows = [...new Set(byKey.values())].map((row) => {
    row.club = pickClub(row._clubs);
    const clubId = row.codigo_club ? `k${row.codigo_club}` : `n${normKey(row.club)}`;
    const fieldId = row.codigo_campo ? `c${row.codigo_campo}` : row.campo ? `f${normKey(row.campo)}` : '';
    const id = makeId(row.club, fieldId ? `${clubId}|${fieldId}` : `${clubId}|`);
    delete row._clubs;
    delete row._keys;
    return { id, ...row };
  });
  const ids = new Set(rows.map((r) => r.id));
  if (ids.size !== rows.length) throw new Error(`Colisión de ids: ${rows.length} filas / ${ids.size} ids`);

  const conCoords = rows.filter((r) => r.lat !== null && r.lng !== null).length;
  console.log(`Filas: ${rows.length} | con coordenadas: ${conCoords} | sin campo: ${rows.length - conCoords}`);

  if (GEN_SQL) {
    const old = path.join(ROOT, 'ffcv_equipos_data.sql');
    if (fs.existsSync(old)) fs.unlinkSync(old);
    const files = writeSqlFiles(rows, now);
    console.log(`SQL generado (${files.length} ficheros, <=${MAX_SQL_BYTES / 1000} kB c/u): ${files.join(', ')}`);
  }

  if (DRY_RUN) {
    const sample = path.join(ROOT, 'ffcv_equipos_preview.json');
    fs.writeFileSync(sample, JSON.stringify(rows.slice(0, 25), null, 2), 'utf8');
    console.log(`Dry-run: vista previa en ${path.relative(ROOT, sample)}`);
    return;
  }

  // Salvaguarda: nunca subir/borrar si la extracción vino corta (API a medias).
  // Solo aplica a extracciones completas: con --clubes/--limite el recuento
  // parcial es esperado y no dice nada sobre el resto de la tabla.
  const existentes = await countRows();
  const parcial = Boolean(SOLO_CLUBES.length || LIMITE);
  if (!parcial && existentes > 0 && rows.length < existentes * 0.6 && !FORCE) {
    throw new Error(
      `Extracción sospechosa: ${rows.length} filas nuevas frente a ${existentes} existentes (>40% de pérdida). ` +
        'Reintenta más tarde o usa --force si es intencionado.'
    );
  }

  await upsertSupabase(rows);
  // La limpieza solo aplica a una extracción completa: con --clubes/--limite
  // se añaden filas sin tocar el resto.
  if (!parcial) await deleteStale(now);
  else console.log('Limpieza: omitida (extracción parcial)');
  await fixBrokenShields();
  console.log(`Listo: ${rows.length} equipos en Supabase (tabla ffcv_equipos)`);
}

main().catch((e) => {
  console.error('Error:', e.message || e);
  process.exit(1);
});
