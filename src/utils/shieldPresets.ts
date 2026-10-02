// Escudo por defecto (Data URI SVG): se muestra cuando no hay escudo cargado.
// Garantiza carga instantánea, 100% offline y sin problemas de CORS.

import { Partido } from '../types';

// Único escudo genérico y neutro (gris, balón blanco, sin colores ni nombre de club).
const svgDefaultShield = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
  <path d="M50 4 L88 16 C88 66 50 108 50 108 C50 108 12 66 12 16 Z" fill="#9ca3af" stroke="#4b5563" stroke-width="2"/>
  <path d="M50 9 L83 20 C83 63 50 102 50 102 C50 102 17 63 17 20 Z" fill="#6b7280"/>
  <circle cx="50" cy="61" r="16" fill="#e5e7eb" stroke="#374151" stroke-width="1.8"/>
  <polygon points="50,51 56,56 54,64 46,64 44,56" fill="#374151"/>
  <line x1="50" y1="51" x2="50" y2="45" stroke="#374151" stroke-width="1.5"/>
  <line x1="56" y1="56" x2="62" y2="53" stroke="#374151" stroke-width="1.5"/>
  <line x1="54" y1="64" x2="59" y2="71" stroke="#374151" stroke-width="1.5"/>
  <line x1="46" y1="64" x2="41" y2="71" stroke="#374151" stroke-width="1.5"/>
  <line x1="44" y1="56" x2="38" y2="53" stroke="#374151" stroke-width="1.5"/>
</svg>`;

const toDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/** Escudo por defecto: club, equipos y datos ausentes. */
export const DEFAULT_CLUB_SHIELD = toDataUri(svgDefaultShield);

/** Mismo escudo por defecto para el rival/visitante sin escudo propio. */
export const DEFAULT_VISITOR_SHIELD = toDataUri(svgDefaultShield);

// Escudo a mostrar para el rival/visitante: su URL propia si existe; si no, el escudo genérico.
export const resolveVisitorShield = (partido: Partido): string =>
  partido.escudoVisitante?.trim() ? partido.escudoVisitante.trim() : DEFAULT_VISITOR_SHIELD;
