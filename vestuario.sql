-- ============================================================
-- Hoja de datos de VESTUARIO (tallas por prenda + nombre/número
-- de camiseta) y su catálogo de prendas gestionado por SERIGRAFÍA.
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Catálogo de prendas (lo añade y borra el rol "serigrafía")
-- ------------------------------------------------------------
create table if not exists vestuario_tipos (
  id text primary key,
  nombre text not null,
  orden integer default 0,
  activo boolean default true,
  created_at timestamptz not null default now()
);

alter table vestuario_tipos enable row level security;

do $$
begin
  create policy "rw vestuario_tipos" on vestuario_tipos
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- 2) Hoja de vestuario: una fila por jugador y por prenda (talla)
-- ------------------------------------------------------------
create table if not exists vestuario (
  id text primary key,
  "jugadorId" text not null,
  temporada text default '',
  "tipoPrenda" text not null,
  talla text default '',
  "actualizadoEn" text default '',
  created_at timestamptz not null default now()
);

alter table vestuario enable row level security;

do $$
begin
  create policy "rw vestuario" on vestuario
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- Una sola talla por jugador y prenda
create unique index if not exists vestuario_jugador_prenda
  on vestuario ("jugadorId", "tipoPrenda");

create index if not exists vestuario_jugador
  on vestuario ("jugadorId");

-- ------------------------------------------------------------
-- 3) Nombre y número de camiseta en la ficha del jugador
-- ------------------------------------------------------------
alter table jugadores add column if not exists "nombreCamiseta" text;
alter table jugadores add column if not exists "numeroCamiseta" text;

-- ------------------------------------------------------------
-- 3b) Tallas disponibles de cada prenda (las elige el jugador)
--     y fecha límite (YYYY-MM-DD) hasta la que puede editar su hoja
-- ------------------------------------------------------------
alter table vestuario_tipos add column if not exists "tallasDisponibles" text default '';

do $$
begin
  alter table club_config add column if not exists "vestuarioFechaLimite" text default '';
exception
  when undefined_table then null;   -- la tabla club_config aún no existe
  when duplicate_column then null;  -- ya añadida en una ejecución anterior
end $$;

-- ------------------------------------------------------------
-- 4) Prendas iniciales
-- ------------------------------------------------------------
insert into vestuario_tipos (id, nombre, orden) values
  ('vtip_camiseta', 'Camiseta', 1),
  ('vtip_pantalon', 'Pantalón', 2),
  ('vtip_chandal', 'Chandal', 3),
  ('vtip_paseo', 'Ropa de paseo', 4)
on conflict (id) do nothing;

-- ============================================================
-- Comprobación:
--   select * from vestuario_tipos order by orden;
--   select * from vestuario;
-- ============================================================
