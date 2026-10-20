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
  fechaNacimiento?: string; // Fecha de nacimiento (YYYY-MM-DD)
  pass?: string; // Contraseña de acceso del jugador
  nombreCamiseta?: string; // Nombre impreso en la espalda de la camiseta
  numeroCamiseta?: string; // Número impreso en la camiseta
}

/** Prenda del vestuario del club (catálogo gestionado por el rol vestuario). */
export interface VestuarioTipo {
  id: string;
  nombre: string; // Ej: "Camiseta", "Pantalón", "Chandal", "Ropa de paseo"
  /** Tallas disponibles de esta prenda, separadas por comas (ej: "S, M, L, XL"). */
  tallasDisponibles?: string;
  /** Precio de la prenda en euros (lo añade el rol caja). Ej: "12,50" */
  precio?: string;
  orden?: number;
  activo?: boolean;
}

/** Selección de talla de un jugador para una prenda de la hoja de vestuario. */
export interface VestuarioItem {
  id: string;
  jugadorId: string;
  temporada?: string;
  tipoPrenda: string; // Nombre de la prenda (unión con VestuarioTipo.nombre)
  talla?: string;
  /** Estado de entrega de esa prenda: pendiente | entregado | sin_stock */
  estado?: string;
  /** true = pagado */
  pagado?: boolean | string;
  /** Día en que el jugador pidió la prenda (YYYY-MM-DD, automática). */
  fechaSolicitud?: string;
  /** Día en que vestuario la entregó (YYYY-MM-DD, automática al marcar Entregado). */
  fechaEntrega?: string;
  actualizadoEn?: string;
}

/** Fechas guardadas de una prenda dentro de la fila de la hoja. */
export interface FechasPrenda {
  solicitud?: string;
  entrega?: string;
}

/** Fila a guardar en la hoja de vestuario: datos de camiseta + tallaje por prenda. */
export interface FilaVestuario {
  jugadorId: string;
  nombreCamiseta?: string;
  numeroCamiseta?: string;
  /** prenda -> talla. Una talla vacía elimina la fila de esa prenda. */
  tallas?: Record<string, string>;
  /** prenda -> estado de entrega (pendiente | entregado | sin_stock) */
  estados?: Record<string, string>;
  /** prenda -> pagado */
  pagados?: Record<string, boolean>;
  /** prenda -> fechas de solicitud y entrega (solo lectura: las calcula el servidor de datos) */
  fechas?: Record<string, FechasPrenda>;
}

/** Conceptos que se cobran en la hoja de caja. */
export type CampoCaja = 'matricula' | 'temporada' | 'ropaNuevo' | 'ropaRenovacion';

/** Forma de pago de un apartado de la hoja de caja. */
export type MetodoPago = '' | 'efectivo' | 'transferencia' | 'tarjeta';

/** Cobro de un apartado: tipo de pago, casilla de pagado, día y pago fraccionado. */
export interface PagoCaja {
  /** true = apartado cobrado por completo */
  pagado?: boolean | string;
  /** efectivo | transferencia | tarjeta */
  metodo?: MetodoPago | string;
  /** Día del cobro (YYYY-MM-DD) */
  fecha?: string;
  /** Importe cobrado hasta la fecha (para pagos fraccionados) */
  importe?: string;
}

/** Hoja de caja: importes de matrícula, temporada y ropa por jugador (rol caja). */
export interface CajaJugador {
  /** Se usa el id del jugador (una ficha de caja por jugador). */
  id: string;
  jugadorId: string;
  /** Cuota de matrícula en euros (texto libre: "60" o "60,50"). */
  matricula?: string;
  /** Cuota de la temporada en euros. */
  temporada?: string;
  /** Importe de ropa nueva en euros. */
  ropaNuevo?: string;
  /** Importe de ropa de renovación en euros. */
  ropaRenovacion?: string;
  /** Suma de los cuatro importes (se recalcula al guardar). */
  total?: string;
  /** Cobro por apartado: tipo de pago, pagado, día e importe fraccionado. */
  pagos?: Partial<Record<CampoCaja, PagoCaja>>;
  actualizadoEn?: string;
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
  whatsapp?: string; // URL de invitación al grupo de WhatsApp del equipo
}

export interface ClubConfig {
  nombre: string;
  escudo: string; // URL al escudo oficial del club
  acronimo?: string;
  lema?: string;
  temporada?: string;
  colorPrimario?: string; // Color principal de la app (hex), derivado del escudo del club
  colorSecundario?: string; // Color secundario/acento (hex)
  ubicacion?: string; // Dirección / ubicación de las instalaciones del club
  vestuarioFechaLimite?: string; // Último día (YYYY-MM-DD) en que los jugadores pueden editar su hoja
  // Importes por defecto de la hoja de caja (los fija el rol Caja)
  cajaDefMatricula?: string;
  cajaDefTemporada?: string;
  cajaDefRopaNuevo?: string;
  cajaDefRopaRenovacion?: string;
  ts?: number; // Marca de última edición (sincronización entre dispositivos)
}

export interface Categoria {
  id: string;
  nombre: string;
  tipo: TipoFutbol; // 'F7', 'F8' o 'F11'
  tiempojuego: number; // Minutos de cada parte (2 partes)
  tiempoJuego?: number; // Alias para compatibilidad de nomenclatura
  temporada?: string; // Columna temporada
  anos?: string; // Años de la categoría (ej: "2010/2011")
}

export interface Entrenador {
  id: string;
  nombre: string;
  telefono: string;
  equipo?: string; // Equipo al que pertenece
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
  suspendido?: boolean | string; // El entrenador marca el partido como suspendido antes de la alineación
  suspensionMotivo?: string; // Mensaje/motivo que verá el equipo
  suspensionHasta?: string; // Reanudación ('YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM'); vacío = definitivo
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

/** Respuesta del jugador a una sesión de entrenamiento: ¿voy o no voy? */
export type EstadoRespuestaSesion = 'si' | 'no';

export interface RespuestaSesion {
  id: string;
  sesionId: string;
  jugadorId: string;
  equipo: string;
  estado: EstadoRespuestaSesion;
  actualizadoEn?: string;
}

/** Respuesta del jugador a un partido: ¿voy o no voy? */
export interface RespuestaPartido {
  id: string;
  partidoId: string;
  jugadorId: string;
  equipo: string;
  estado: EstadoRespuestaSesion;
  actualizadoEn?: string;
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
  suspendido?: boolean | string; // Sesión suspendida (temporal o definitiva)
  suspensionMotivo?: string; // Mensaje/motivo que verá el equipo
  suspensionHasta?: string; // Reanudación ('YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM'); vacío = definitivo
}

/** Frase motivadora activa de un equipo (tabla frases_motivadoras_365; equipo '' = todo el club). */
export interface FraseMotivadora {
  id?: string;
  frase: string;
  equipo?: string; // Nombre del equipo; vacío = todo el club
  categoria?: string; // Categoría del equipo (columna creada en Supabase)
  creadaEn?: string; // ISO timestamp
  creadaPor?: string; // Nombre de quien la activó
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

export type RolUsuario =
  | 'admin'
  | 'entrenador'
  | 'coordinador_f8'
  | 'coordinador_f11'
  | 'jugador'
  | 'directiva'
  | 'vestuario'
  | 'caja'
  | 'aficionado';

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
  | 'vestuario'
  | 'caja'
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
