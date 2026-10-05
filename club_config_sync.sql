-- Identidad del club sincronizada entre dispositivos + equipo del entrenador
-- Ejecutar una vez en el SQL Editor de Supabase (idempotente).

create table if not exists club_config (
  id text primary key,
  nombre text,
  escudo text,
  acronimo text,
  lema text,
  temporada text,
  "colorPrimario" text,
  "colorSecundario" text,
  ubicacion text,
  ts bigint default 0
);

alter table club_config add column if not exists nombre text;
alter table club_config add column if not exists escudo text;
alter table club_config add column if not exists acronimo text;
alter table club_config add column if not exists lema text;
alter table club_config add column if not exists temporada text;
alter table club_config add column if not exists "colorPrimario" text;
alter table club_config add column if not exists "colorSecundario" text;
alter table club_config add column if not exists ubicacion text;
alter table club_config add column if not exists ts bigint default 0;

alter table club_config enable row level security;
drop policy if exists "rw club_config" on club_config;
create policy "rw club_config" on club_config for all using (true) with check (true);

-- Equipo al que pertenece cada entrenador
alter table entrenadores add column if not exists equipo text;
