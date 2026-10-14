-- Tabla FFCV: clubes de fútbol base de la provincia de Valencia
-- con escudo y campos de juego (dirección y coordenadas). Ejecutar en el SQL Editor.
-- Una fila por (club, campo): mismo club en el mismo campo -> una fila;
-- mismo club con campos distintos -> una fila por ubicación.

create table if not exists ffcv_equipos (
  id text primary key,          -- determinista: slug(club)+hash(club|campo)
  club text not null,
  escudo text,                  -- URL absoluta del escudo del club
  campo text,                   -- nombre del campo de juego
  codigo_campo text,
  direccion text,
  localidad text,
  provincia text,
  cp text,
  lat double precision,
  lng double precision,
  codigo_club text,
  updated_at timestamptz default now()
);

create index if not exists ffcv_equipos_club_idx on ffcv_equipos (club);
create index if not exists ffcv_equipos_localidad_idx on ffcv_equipos (localidad);

alter table ffcv_equipos enable row level security;
create policy "rw ffcv_equipos" on ffcv_equipos for all using (true) with check (true);

-- Migración de tablas creadas con las columnas categoria y nombre (innecesarias)
drop index if exists ffcv_equipos_categoria_idx;
alter table ffcv_equipos drop column if exists categoria;
drop index if exists ffcv_equipos_nombre_idx;
alter table ffcv_equipos drop column if exists nombre;
