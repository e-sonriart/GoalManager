const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/** Orden fijo de categorías/equipo: querubín → prebenjamín → benjamín → alevín → F8 → infantil → cadete → juvenil */
const CATEGORY_ORDER = [
  'querubin',
  'prebenjamin',
  'benjamin',
  'alevin',
  'f8',
  'infantil',
  'cadete',
  'juvenil',
  'senior'
];

export function getCategoryOrder(categoria: string): number {
  const c = normalize(categoria || '');
  if (!c) return CATEGORY_ORDER.length;
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    if (c === CATEGORY_ORDER[i] || c.includes(CATEGORY_ORDER[i])) return i;
  }
  return CATEGORY_ORDER.length;
}

/** Compara dos nombres de equipo por categoría (orden fijo del club) y luego alfabéticamente. */
export function compareTeams(a: string, b: string, equipos: { nombre: string; categoria: string }[]): number {
  const eqA = equipos.find(e => e.nombre === a);
  const eqB = equipos.find(e => e.nombre === b);
  const orderA = getCategoryOrder(eqA?.categoria || a);
  const orderB = getCategoryOrder(eqB?.categoria || b);
  if (orderA !== orderB) return orderA - orderB;
  return a.localeCompare(b, 'es');
}
