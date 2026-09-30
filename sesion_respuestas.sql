-- ============================================================
-- Respuestas de jugadores a entrenamientos (¿voy / no voy?)
-- Ejecutar en Supabase SQL Editor (una sola vez).
-- ============================================================

create table if not exists sesion_respuestas (
  id text primary key,
  "sesionId" text not null,
  "jugadorId" text not null,
  equipo text default '',
  estado text not null default 'si',
  "actualizadoEn" text default '',
  created_at timestamptz not null default now()
);

alter table sesion_respuestas enable row level security;

do $$
begin
  create policy "rw sesion_respuestas" on sesion_respuestas
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

create index if not exists sesion_respuestas_sesion
  on sesion_respuestas ("sesionId");

-- ============================================================
-- Comprobación:
--   select * from sesion_respuestas;
-- ============================================================
