-- GoalManager schema for Supabase
-- Ejecutar en SQL Editor

create table if not exists categorias (
  id text primary key,
  nombre text,
  tipo text,
  tiempojuego int,
  temporada text
);

create table if not exists entrenadores (
  id text primary key,
  nombre text,
  telefono text,
  temporada text
);

create table if not exists equipos (
  id text primary key,
  nombre text,
  categoria text,
  letra text,
  ano text,
  entrenador text,
  entrenadores jsonb,
  temporada text,
  escudo text,
  division text,
  grupo text,
  "linkClasificacion" text
);

create table if not exists jugadores (
  id text primary key,
  nombre text,
  dorsal text,
  posicion text,
  categoria text,
  equipo text,
  temporada text,
  "fechaAlta" text
);

create table if not exists estadisticas (
  id text primary key,
  "jugadorId" text,
  temporada text,
  goles int default 0,
  asistencias int default 0,
  tarjetas int default 0,
  "tarjetasAmarillas" int default 0,
  "tarjetasRojas" int default 0,
  "partidosJugados" int default 0,
  titular int default 0,
  historico jsonb
);

create table if not exists partidos (
  id text primary key,
  equipo text,
  condicion text,
  rival text,
  "escudoVisitante" text,
  local text,
  visitante text,
  fecha text,
  hora text,
  "horaConvocatoria" text,
  categoria text,
  campo text,
  tipo text,
  jornada text,
  "golesLocal" text,
  "golesVisitante" text,
  eventos text,
  finalizado text,
  convocados jsonb,
  titulares jsonb,
  formacion text,
  temporada text
);

create table if not exists asistencias (
  id text primary key,
  "jugadorId" text,
  fecha text,
  estado text,
  temporada text
);

create table if not exists sesiones (
  id text primary key,
  equipo text,
  categoria text,
  tipo text,
  fecha text,
  hora text,
  "horaFin" text,
  lugar text,
  titulo text,
  objetivo text,
  descripcion text,
  temporada text,
  "creadoPor" text,
  "creadoEn" text
);

create table if not exists usuarios (
  id text primary key,
  nombre text,
  email text,
  rol text,
  equipo text,
  "equipoId" text,
  password text
);

-- RLS: permitir todo con anon key (app de club, sin multi-tenant)
alter table categorias enable row level security;
alter table entrenadores enable row level security;
alter table equipos enable row level security;
alter table jugadores enable row level security;
alter table estadisticas enable row level security;
alter table partidos enable row level security;
alter table asistencias enable row level security;
alter table sesiones enable row level security;
alter table usuarios enable row level security;

create policy "rw categorias" on categorias for all using (true) with check (true);
create policy "rw entrenadores" on entrenadores for all using (true) with check (true);
create policy "rw equipos" on equipos for all using (true) with check (true);
create policy "rw jugadores" on jugadores for all using (true) with check (true);
create policy "rw estadisticas" on estadisticas for all using (true) with check (true);
create policy "rw partidos" on partidos for all using (true) with check (true);
create policy "rw asistencias" on asistencias for all using (true) with check (true);
create policy "rw sesiones" on sesiones for all using (true) with check (true);
create policy "rw usuarios" on usuarios for all using (true) with check (true);

-- Reloj y eventos en vivo por partido
create table if not exists match_clocks (
  id text primary key,
  clock jsonb not null,
  updated_at timestamptz default now()
);
alter table match_clocks enable row level security;
create policy "rw match_clocks" on match_clocks for all using (true) with check (true);

-- Identidad del club (nombre/escudo/lema) sincronizada entre dispositivos
create table if not exists club_config (
  id text primary key,
  nombre text,
  escudo text,
  acronimo text,
  lema text,
  temporada text,
  ts bigint default 0
);
alter table club_config enable row level security;
create policy "rw club_config" on club_config for all using (true) with check (true);
