// Colección de escudos vectoriales deportivos de alta calidad (Data URIs SVG)
// Garantizan carga instantánea, 100% offline y sin problemas de CORS.

import { Partido } from '../types';

export interface ShieldPreset {
  id: string;
  name: string;
  url: string;
  colors: string;
}

// 1. Escudo Clásico Naranja Real (Corona + Balón + Rayas)
const svgOrangeClassic = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
  <defs>
    <linearGradient id="gradOrange" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
  </defs>
  <!-- Sombra exterior -->
  <path d="M50 8 L88 20 C88 70 50 112 50 112 C50 112 12 70 12 20 Z" fill="#0f172a" opacity="0.2"/>
  <!-- Contorno exterior -->
  <path d="M50 4 L88 16 C88 66 50 108 50 108 C50 108 12 66 12 16 Z" fill="url(#gold)" stroke="#78350f" stroke-width="2"/>
  <!-- Fondo interior -->
  <path d="M50 9 L83 20 C83 63 50 102 50 102 C50 102 17 63 17 20 Z" fill="#0f172a"/>
  <!-- Franjas Naranjas -->
  <path d="M30 18 L40 16 L40 94 C36 90 32 84 30 80 Z" fill="url(#gradOrange)"/>
  <path d="M46 15 L54 15 L54 100 L46 100 Z" fill="url(#gradOrange)"/>
  <path d="M60 16 L70 18 L70 80 C68 84 64 90 60 94 Z" fill="url(#gradOrange)"/>
  <!-- Corona Superior -->
  <path d="M35 15 L40 25 L50 18 L60 25 L65 15 L60 30 L40 30 Z" fill="url(#gold)" stroke="#854d0e" stroke-width="0.8"/>
  <!-- Balón Central -->
  <circle cx="50" cy="58" r="16" fill="#ffffff" stroke="#0f172a" stroke-width="1.8"/>
  <polygon points="50,47 57,52 54,61 46,61 43,52" fill="#0f172a"/>
  <line x1="50" y1="47" x2="50" y2="42" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="57" y1="52" x2="64" y2="50" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="54" y1="61" x2="60" y2="69" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="46" y1="61" x2="40" y2="69" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="43" y1="52" x2="36" y2="50" stroke="#0f172a" stroke-width="1.5"/>
  <!-- Estrella Dorada -->
  <polygon points="50,82 52,87 57,87 53,90 55,95 50,92 45,95 47,90 43,87 48,87" fill="url(#gold)"/>
</svg>`;

// 2. Escudo Real Azul & Dorado (Royal Crown & Lion Crest)
const svgRoyalBlue = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
  <defs>
    <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e40af"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="gradGold2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
  </defs>
  <path d="M50 4 L88 16 C88 66 50 108 50 108 C50 108 12 66 12 16 Z" fill="url(#gradGold2)" stroke="#713f12" stroke-width="2"/>
  <path d="M50 9 L83 20 C83 63 50 102 50 102 C50 102 17 63 17 20 Z" fill="url(#gradBlue)"/>
  <!-- Franja Diagonal Blanca -->
  <path d="M17 35 L75 96 C70 99 65 101 60 102 L17 55 Z" fill="#ffffff" opacity="0.85"/>
  <!-- Balón Vintage -->
  <circle cx="50" cy="56" r="17" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8"/>
  <circle cx="50" cy="56" r="12" fill="none" stroke="#64748b" stroke-width="1"/>
  <polygon points="50,45 57,51 55,59 45,59 43,51" fill="#1e293b"/>
  <!-- Corona Real -->
  <path d="M30 18 L34 26 L50 20 L66 26 L70 18 L64 30 L36 30 Z" fill="url(#gradGold2)" stroke="#713f12" stroke-width="0.8"/>
  <circle cx="30" cy="18" r="2.5" fill="#ffffff"/>
  <circle cx="50" cy="20" r="3" fill="#ffffff"/>
  <circle cx="70" cy="18" r="2.5" fill="#ffffff"/>
</svg>`;

// 3. Escudo Atlético Rojo y Blanco (Rayas y Balón)
const svgRedStripes = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
  <defs>
    <linearGradient id="gradRed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>
    <linearGradient id="borderSilver" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
  </defs>
  <path d="M50 4 L88 16 C88 66 50 108 50 108 C50 108 12 66 12 16 Z" fill="url(#borderSilver)" stroke="#475569" stroke-width="2"/>
  <path d="M50 9 L83 20 C83 63 50 102 50 102 C50 102 17 63 17 20 Z" fill="#ffffff"/>
  <!-- Rayas Rojas -->
  <path d="M22 21 L32 22 L32 82 C28 76 24 70 22 64 Z" fill="url(#gradRed)"/>
  <path d="M38 23 L48 24 L48 97 C44 94 41 90 38 86 Z" fill="url(#gradRed)"/>
  <path d="M52 24 L62 23 L62 86 C59 90 56 94 52 97 Z" fill="url(#gradRed)"/>
  <path d="M68 22 L78 21 L78 64 C76 70 72 76 68 82 Z" fill="url(#gradRed)"/>
  <!-- Franja Superior Azul Marino -->
  <path d="M17 20 L50 9 L83 20 L83 38 L17 38 Z" fill="#0f172a"/>
  <text x="50" y="31" fill="#f8fafc" font-size="9" font-family="sans-serif" font-weight="900" text-anchor="middle" letter-spacing="1">CLUB</text>
  <!-- Balón en Primer Plano -->
  <circle cx="50" cy="62" r="16" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
  <polygon points="50,52 56,56 54,64 46,64 44,56" fill="#0f172a"/>
  <line x1="50" y1="52" x2="50" y2="46" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="56" y1="56" x2="62" y2="54" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="54" y1="64" x2="59" y2="72" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="46" y1="64" x2="41" y2="72" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="44" y1="56" x2="38" y2="54" stroke="#0f172a" stroke-width="1.5"/>
</svg>`;

// 4. Escudo Verde & Dorado (Sporting Esmeralda)
const svgEmeraldGold = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
  <defs>
    <linearGradient id="gradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>
    <linearGradient id="gradGold3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <path d="M50 4 L88 16 C88 66 50 108 50 108 C50 108 12 66 12 16 Z" fill="url(#gradGold3)" stroke="#78350f" stroke-width="2"/>
  <path d="M50 9 L83 20 C83 63 50 102 50 102 C50 102 17 63 17 20 Z" fill="url(#gradGreen)"/>
  <!-- Chevron Central Blanco -->
  <path d="M50 35 L80 55 L80 65 L50 45 L20 65 L20 55 Z" fill="#ffffff" opacity="0.9"/>
  <!-- Balón Central Dorado -->
  <circle cx="50" cy="72" r="15" fill="#f8fafc" stroke="#064e3b" stroke-width="2"/>
  <polygon points="50,63 55,67 53,75 47,75 45,67" fill="#064e3b"/>
  <!-- Corona de Laurel -->
  <path d="M28 75 C28 85 38 95 50 98 C62 95 72 85 72 75" fill="none" stroke="url(#gradGold3)" stroke-width="3" stroke-linecap="round"/>
</svg>`;

// 5. Escudo Púrpura y Magenta (Féminas & Modern)
const svgPurpleGold = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
  <defs>
    <linearGradient id="gradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#581c87"/>
    </linearGradient>
    <linearGradient id="gradRose" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#881337"/>
    </linearGradient>
  </defs>
  <path d="M50 4 L88 16 C88 66 50 108 50 108 C50 108 12 66 12 16 Z" fill="#ffffff" stroke="#c084fc" stroke-width="2"/>
  <path d="M50 9 L83 20 C83 63 50 102 50 102 C50 102 17 63 17 20 Z" fill="url(#gradPurple)"/>
  <!-- Destello Rosa Diagonal -->
  <path d="M83 20 L17 80 C17 85 20 90 24 95 L83 35 Z" fill="url(#gradRose)" opacity="0.6"/>
  <!-- Balón con Estrella -->
  <circle cx="50" cy="56" r="16" fill="#ffffff" stroke="#581c87" stroke-width="2"/>
  <polygon points="50,46 56,51 54,59 46,59 44,51" fill="#581c87"/>
  <!-- Estrella Superior -->
  <polygon points="50,22 52,27 57,27 53,30 55,35 50,32 45,35 47,30 43,27 48,27" fill="#fde047"/>
</svg>`;

// 6. Escudo Negro & Dorado Élite (Black & Gold Championship)
const svgBlackGold = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
  <defs>
    <linearGradient id="gradGoldElite" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="30%" stop-color="#eab308"/>
      <stop offset="70%" stop-color="#ca8a04"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>
  </defs>
  <path d="M50 4 L88 16 C88 66 50 108 50 108 C50 108 12 66 12 16 Z" fill="url(#gradGoldElite)" stroke="#451a03" stroke-width="2.5"/>
  <path d="M50 9 L83 20 C83 63 50 102 50 102 C50 102 17 63 17 20 Z" fill="#09090b"/>
  <!-- Franjas Doradas Finas -->
  <line x1="30" y1="20" x2="30" y2="80" stroke="url(#gradGoldElite)" stroke-width="1.5"/>
  <line x1="70" y1="20" x2="70" y2="80" stroke="url(#gradGoldElite)" stroke-width="1.5"/>
  <!-- Corona Élite -->
  <path d="M35 22 L40 30 L50 24 L60 30 L65 22 L58 35 L42 35 Z" fill="url(#gradGoldElite)"/>
  <!-- Balón Central Dorado -->
  <circle cx="50" cy="60" r="16" fill="#18181b" stroke="url(#gradGoldElite)" stroke-width="2"/>
  <polygon points="50,50 56,54 54,62 46,62 44,54" fill="url(#gradGoldElite)"/>
  <circle cx="50" cy="60" r="3" fill="#fef08a"/>
</svg>`;

const toDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const SHIELD_PRESETS: ShieldPreset[] = [
  {
    id: 'orange-classic',
    name: 'Naranja Real',
    url: toDataUri(svgOrangeClassic),
    colors: 'from-orange-500 to-amber-600'
  },
  {
    id: 'royal-blue',
    name: 'Azul Real & Oro',
    url: toDataUri(svgRoyalBlue),
    colors: 'from-blue-600 to-indigo-800'
  },
  {
    id: 'red-stripes',
    name: 'Atlético Franjas',
    url: toDataUri(svgRedStripes),
    colors: 'from-red-600 to-red-800'
  },
  {
    id: 'emerald-gold',
    name: 'Verde Esmeralda',
    url: toDataUri(svgEmeraldGold),
    colors: 'from-emerald-500 to-teal-700'
  },
  {
    id: 'purple-gold',
    name: 'Púrpura & Rosa',
    url: toDataUri(svgPurpleGold),
    colors: 'from-purple-600 to-pink-600'
  },
  {
    id: 'black-gold',
    name: 'Negro & Dorado Élite',
    url: toDataUri(svgBlackGold),
    colors: 'from-zinc-800 to-amber-500'
  }
];

// Escudo genérico y neutro para el rival/visitante (gris, balón blanco, sin colores ni nombre de club)
const svgVisitorGeneric = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
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

export const DEFAULT_CLUB_SHIELD = toDataUri(svgOrangeClassic);
export const DEFAULT_TEAM_SHIELD_1 = toDataUri(svgOrangeClassic);
export const DEFAULT_TEAM_SHIELD_2 = toDataUri(svgRoyalBlue);
export const DEFAULT_TEAM_SHIELD_3 = toDataUri(svgPurpleGold);
export const DEFAULT_TEAM_SHIELD_4 = toDataUri(svgRedStripes);
export const DEFAULT_VISITOR_SHIELD = toDataUri(svgVisitorGeneric);

// Escudo a mostrar para el rival/visitante: su URL propia si existe; si no, un escudo genérico neutro.
export const resolveVisitorShield = (partido: Partido): string =>
  partido.escudoVisitante?.trim() ? partido.escudoVisitante.trim() : DEFAULT_VISITOR_SHIELD;
