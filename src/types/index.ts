export type PosicionJugador = 'Portero' | 'Defensa' | 'Centrocampista' | 'Delantero';

export interface Jugador {
  id: string;
  nombre: string;
  dorsal: number | string;
  posicion: PosicionJugador;
  categoria: string;
  equipo: string;
  temporada?: string; // Columna temporada
  fechaAlta: string;
}

export type TipoFutbol = 'F8' | 'F11';
export type AnoEquipo = '1er año' | '2do año' | '';

export interface Equipo {
  id: string;
  nombre: string; // Ej: "Alevín A"
  categoria: string; // Ej: "Alevín" (Columna categoría)
  letra: string; // Ej: "A", "B", "C"
  ano?: AnoEquipo; // Para F8: '1er año' | '2do año' | ''
  entrenador?: string; // Para compatibilidad
  entrenadores?: string[]; // Lista de entrenadores asignados
  temporada?: string; // Columna temporada
  escudo?: string; // Enlace o URL de la imagen del escudo (o hereda del club)
  division?: string; // Ej: "2ª División"
  grupo?: string; // Ej: "Grupo 3"
  linkClasificacion?: string; // URL a la clasificación oficial de la liga
}

export interface ClubConfig {
  nombre: string;
  escudo: string; // URL al escudo oficial del club
  acronimo?: string;
  lema?: string;
  temporada?: string;
  ts?: number; // Marca de última edición (sincronización entre dispositivos)
}

export interface Categoria {
  id: string;
  nombre: string;
  tipo: TipoFutbol; // 'F7', 'F8' o 'F11'
  tiempojuego: number; // Minutos de cada parte (2 partes)
  tiempoJuego?: number; // Alias para compatibilidad de nomenclatura
  temporada?: string; // Columna temporada
}

export interface Entrenador {
  id: string;
  nombre: string;
  telefono: string;
  temporada?: string;
}

export type CondicionPartido = 'casa' | 'fuera';
export type TipoPartido = 'Liga' | 'Amistoso' | 'Torneo';

export interface Partido {
  id: string;
  equipo: string; // Nuestro equipo del club (protagonista, ej: "Alevín A")
  condicion?: CondicionPartido; // 'casa' (local) | 'fuera' (visitante)
  rival?: string; // Equipo contra quien juega
  escudoVisitante?: string; // URL del escudo del rival/visitante. Si no hay, se muestra un escudo genérico.
  local: string; // Si condicion==='casa' -> equipo club; si 'fuera' -> rival
  visitante: string; // Si condicion==='casa' -> rival; si 'fuera' -> equipo club
  fecha: string;
  hora?: string;
  horaConvocatoria?: string;
  categoria: string;
  campo?: string;
  tipo?: TipoPartido;
  jornada?: string | number;
  golesLocal?: number | string;
  golesVisitante?: number | string;
  eventos?: string;
  finalizado?: boolean | string;
  convocados?: string[]; // IDs de jugadores convocados directamente en el partido
  titulares?: string[]; // IDs de la alineación inicial (11 o 8 según modalidad)
  formacion?: string; // Táctica elegida, p. ej. '1-4-3-3' o '1-2-3-2'
  temporada?: string;
}

export type EstadoConvocatoria = 'convocado' | 'no convocado';
export type EstadoAsistencia = 'asiste' | 'no asiste';

export interface Asistencia {
  id: string;
  jugadorId: string;
  fecha: string;
  estado: EstadoAsistencia;
  temporada?: string;
}

export type TipoEntrenamiento =
  | 'tecnico'
  | 'tactico'
  | 'fisico'
  | 'recuperacion'
  | 'porteros'
  | 'partido-11'
  | 'otro';

export interface SesionEntrenamiento {
  id: string;
  equipo: string; // Equipo asignado (p. ej. 'Senior A')
  categoria: string; // Categoría (p. ej. 'Senior')
  tipo?: TipoFutbol; // 'F8' | 'F11' (derivado de la categoría)
  fecha: string; // 'YYYY-MM-DD'
  hora: string; // 'HH:MM'
  horaFin?: string; // Opcional 'HH:MM'
  lugar?: string; // Opcional
  titulo?: string; // Opcional. p. ej. 'Físico + técnica'
  objetivo: string; // Objetivo y descripción de la sesión
  descripcion?: string;
  temporada?: string;
  creadoPor?: string;
  creadoEn?: string;
}

export interface HistorialEstadisticaTemporada {
  temporada: string;
  equipo: string;
  partidosJugados: number;
  titular: number;
  goles: number;
  asistencias: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
}

export interface Estadistica {
  id: string;
  jugadorId: string;
  temporada?: string;
  goles: number;
  asistencias: number;
  tarjetas: number;
  tarjetasAmarillas?: number;
  tarjetasRojas?: number;
  partidosJugados: number;
  titular?: number;
  historico?: HistorialEstadisticaTemporada[];
}

export type RolUsuario = 'admin' | 'entrenador' | 'coordinador_f8' | 'coordinador_f11' | 'jugador' | 'directiva' | 'aficionado';

/**
 * Pestañas de navegación de la aplicación.
 * Se mantiene compatible con el tipo ActiveTab que consume la navegación.
 */
export type AppTab =
  | 'dashboard'
  | 'equipos'
  | 'partidos'
  | 'convocatorias'
  | 'alineacion'
  | 'eventos'
  | 'estadisticas'
  | 'entrenamientos'
  | 'admin';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  equipo?: string; // Equipo registrado asignado (obligatorio para entrenador y jugador)
  equipoId?: string; // ID opcional de equipo
  password?: string;
}

export type User = Usuario;

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface GoogleSheetsConfig {
  scriptUrl: string;
  isOnline: boolean;
  lastSynced?: string;
  autoSync: boolean;
}
