import {
  Jugador,
  Equipo,
  Categoria,
  Entrenador,
  Partido,
  Asistencia,
  Estadistica,
  Usuario
} from '../types';
import {
  DEFAULT_TEAM_SHIELD_1,
  DEFAULT_TEAM_SHIELD_2,
  DEFAULT_TEAM_SHIELD_3,
  DEFAULT_TEAM_SHIELD_4
} from '../utils/shieldPresets';

export const initialCategorias: Categoria[] = [
  { id: 'cat_1', nombre: 'Senior', tipo: 'F11', tiempojuego: 45 },
  { id: 'cat_2', nombre: 'Juvenil', tipo: 'F11', tiempojuego: 45 },
  { id: 'cat_3', nombre: 'Cadete', tipo: 'F11', tiempojuego: 40 },
  { id: 'cat_4', nombre: 'Infantil', tipo: 'F11', tiempojuego: 35 },
  { id: 'cat_5', nombre: 'Alevín', tipo: 'F8', tiempojuego: 30 },
  { id: 'cat_6', nombre: 'Benjamín', tipo: 'F8', tiempojuego: 25 },
  { id: 'cat_7', nombre: 'Prebenjamín', tipo: 'F8', tiempojuego: 25 }
];

export const initialEntrenadores: Entrenador[] = [
  { id: 'ent_1', nombre: 'Carlos Martínez', telefono: '+34 600 123 456' },
  { id: 'ent_2', nombre: 'Laura Gómez', telefono: '+34 600 654 321' },
  { id: 'ent_3', nombre: 'Pablo Fernández', telefono: '+34 600 999 888' },
  { id: 'ent_4', nombre: 'Javier Soria', telefono: '+34 611 445 566' }
];

export const initialEquipos: Equipo[] = [
  {
    id: 'eq_1',
    nombre: 'Senior A',
    categoria: 'Senior',
    letra: 'A',
    entrenador: 'Carlos Martínez',
    entrenadores: ['Carlos Martínez'],
    escudo: DEFAULT_TEAM_SHIELD_1,
    temporada: '2025/2026'
  },
  {
    id: 'eq_2',
    nombre: 'Juvenil A',
    categoria: 'Juvenil',
    letra: 'A',
    entrenador: 'Laura Gómez',
    entrenadores: ['Laura Gómez'],
    escudo: DEFAULT_TEAM_SHIELD_2,
    temporada: '2025/2026'
  },
  {
    id: 'eq_3',
    nombre: 'Cadete A',
    categoria: 'Cadete',
    letra: 'A',
    entrenador: 'Javier Soria',
    entrenadores: ['Javier Soria'],
    escudo: DEFAULT_TEAM_SHIELD_3,
    temporada: '2025/2026'
  },
  {
    id: 'eq_4',
    nombre: 'Alevín A',
    categoria: 'Alevín',
    letra: 'A',
    ano: '2do año',
    entrenador: 'Pablo Fernández',
    entrenadores: ['Pablo Fernández'],
    escudo: DEFAULT_TEAM_SHIELD_4,
    temporada: '2025/2026'
  },
  {
    id: 'eq_5',
    nombre: 'Benjamín B',
    categoria: 'Benjamín',
    letra: 'B',
    ano: '1er año',
    entrenador: 'Carlos Martínez',
    entrenadores: ['Carlos Martínez'],
    escudo: DEFAULT_TEAM_SHIELD_1,
    temporada: '2025/2026'
  }
];

export const initialJugadores: Jugador[] = [
  {
    id: 'jug_1',
    nombre: 'Mateo Silva',
    dorsal: 9,
    posicion: 'Delantero',
    categoria: 'Senior',
    equipo: 'Senior A',
    fechaAlta: '2024-01-15'
  },
  {
    id: 'jug_2',
    nombre: 'Javier Ramos',
    dorsal: 4,
    posicion: 'Defensa',
    categoria: 'Senior',
    equipo: 'Senior A',
    fechaAlta: '2024-01-20'
  },
  {
    id: 'jug_3',
    nombre: 'Hugo Navarro',
    dorsal: 10,
    posicion: 'Centrocampista',
    categoria: 'Senior',
    equipo: 'Senior A',
    fechaAlta: '2024-02-01'
  },
  {
    id: 'jug_4',
    nombre: 'Diego Casillas',
    dorsal: 1,
    posicion: 'Portero',
    categoria: 'Senior',
    equipo: 'Senior A',
    fechaAlta: '2024-01-10'
  },
  {
    id: 'jug_5',
    nombre: 'Lucas Medina',
    dorsal: 8,
    posicion: 'Centrocampista',
    categoria: 'Juvenil',
    equipo: 'Juvenil A',
    fechaAlta: '2024-03-01'
  },
  {
    id: 'jug_6',
    nombre: 'Álvaro Morata',
    dorsal: 11,
    posicion: 'Delantero',
    categoria: 'Senior',
    equipo: 'Senior A',
    fechaAlta: '2024-02-10'
  },
  {
    id: 'jug_7',
    nombre: 'Iker Romero',
    dorsal: 7,
    posicion: 'Delantero',
    categoria: 'Alevín',
    equipo: 'Alevín A',
    fechaAlta: '2024-02-15'
  },
  {
    id: 'jug_8',
    nombre: 'Carla Blanco',
    dorsal: 5,
    posicion: 'Defensa',
    categoria: 'Alevín',
    equipo: 'Alevín A',
    fechaAlta: '2024-01-22'
  }
];

export const initialEstadisticas: Estadistica[] = [
  { id: 'est_1', jugadorId: 'jug_1', goles: 14, asistencias: 6, tarjetas: 2, partidosJugados: 16 },
  { id: 'est_2', jugadorId: 'jug_2', goles: 2, asistencias: 1, tarjetas: 5, partidosJugados: 17 },
  { id: 'est_3', jugadorId: 'jug_3', goles: 8, asistencias: 12, tarjetas: 1, partidosJugados: 15 },
  { id: 'est_4', jugadorId: 'jug_4', goles: 0, asistencias: 0, tarjetas: 0, partidosJugados: 17 },
  { id: 'est_5', jugadorId: 'jug_5', goles: 11, asistencias: 4, tarjetas: 1, partidosJugados: 12 },
  { id: 'est_6', jugadorId: 'jug_6', goles: 5, asistencias: 7, tarjetas: 3, partidosJugados: 14 },
  { id: 'est_7', jugadorId: 'jug_7', goles: 7, asistencias: 3, tarjetas: 4, partidosJugados: 13 },
  { id: 'est_8', jugadorId: 'jug_8', goles: 1, asistencias: 2, tarjetas: 2, partidosJugados: 11 }
];

export const initialPartidos: Partido[] = [
  {
    id: 'par_1',
    equipo: 'Senior A',
    condicion: 'casa',
    rival: 'Atlético Central',
    local: 'Senior A',
    visitante: 'Atlético Central',
    fecha: '2026-09-20T17:00',
    hora: '17:00',
    categoria: 'Senior',
    campo: 'Campo Municipal 1',
    golesLocal: '',
    golesVisitante: '',
    finalizado: false,
    convocados: ['jug_1', 'jug_2', 'jug_3', 'jug_4']
  },
  {
    id: 'par_2',
    equipo: 'Senior A',
    condicion: 'fuera',
    rival: 'Deportivo Unión',
    local: 'Deportivo Unión',
    visitante: 'Senior A',
    fecha: '2026-09-27T12:00',
    hora: '12:00',
    categoria: 'Senior',
    campo: 'Polideportivo San Martín',
    golesLocal: '',
    golesVisitante: '',
    finalizado: false,
    convocados: ['jug_1', 'jug_2']
  },
  {
    id: 'par_3',
    equipo: 'Juvenil A',
    condicion: 'casa',
    rival: 'Rayo Valle',
    local: 'Juvenil A',
    visitante: 'Rayo Valle',
    fecha: '2026-09-21T10:30',
    hora: '10:30',
    categoria: 'Juvenil',
    campo: 'Campo Municipal 2',
    golesLocal: '',
    golesVisitante: '',
    finalizado: false,
    convocados: ['jug_5']
  },
  {
    id: 'par_4',
    equipo: 'Alevín A',
    condicion: 'casa',
    rival: 'CD Sporting Norte',
    local: 'Alevín A',
    visitante: 'CD Sporting Norte',
    fecha: '2026-09-10T19:00',
    hora: '19:00',
    categoria: 'Alevín',
    campo: 'Campo F8 Central',
    golesLocal: 3,
    golesVisitante: 1,
    finalizado: true,
    convocados: ['jug_7', 'jug_8']
  }
];

export const initialAsistencias: Asistencia[] = [
  { id: 'asi_1', jugadorId: 'jug_1', fecha: '2026-09-12', estado: 'asiste' },
  { id: 'asi_2', jugadorId: 'jug_2', fecha: '2026-09-12', estado: 'asiste' },
  { id: 'asi_3', jugadorId: 'jug_3', fecha: '2026-09-12', estado: 'no asiste' },
  { id: 'asi_4', jugadorId: 'jug_4', fecha: '2026-09-12', estado: 'asiste' },
  { id: 'asi_5', jugadorId: 'jug_6', fecha: '2026-09-12', estado: 'asiste' },
  { id: 'asi_6', jugadorId: 'jug_1', fecha: '2026-09-13', estado: 'asiste' },
  { id: 'asi_7', jugadorId: 'jug_2', fecha: '2026-09-13', estado: 'asiste' },
  { id: 'asi_8', jugadorId: 'jug_3', fecha: '2026-09-13', estado: 'asiste' },
  { id: 'asi_9', jugadorId: 'jug_4', fecha: '2026-09-13', estado: 'asiste' },
  { id: 'asi_10', jugadorId: 'jug_6', fecha: '2026-09-13', estado: 'no asiste' }
];

export const initialUsuarios: Usuario[] = [
  { id: 'usr_1', nombre: 'Administrador Club', email: 'admin@clubfutbol.com', rol: 'admin' },
  { id: 'usr_2', nombre: 'Carlos Martínez (Mister)', email: 'mister@clubfutbol.com', rol: 'entrenador', equipo: 'Senior A' },
  { id: 'usr_3', nombre: 'Dirección Deportiva', email: 'direccion@clubfutbol.com', rol: 'direccion' },
  { id: 'usr_4', nombre: 'Mateo Silva (Delantero)', email: 'mateo@clubfutbol.com', rol: 'jugador', equipo: 'Senior A' },
  { id: 'usr_5', nombre: 'Hugo Navarro (Capitán)', email: 'hugo@clubfutbol.com', rol: 'jugador', equipo: 'Senior A' },
  { id: 'usr_6', nombre: 'Laura Gómez (Mister Juvenil)', email: 'laura@clubfutbol.com', rol: 'entrenador', equipo: 'Juvenil A' },
  { id: 'usr_7', nombre: 'Pablo Fernández (Mister Alevín)', email: 'pablo@clubfutbol.com', rol: 'entrenador', equipo: 'Alevín A' }
];
