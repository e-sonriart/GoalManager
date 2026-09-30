-- ============================================================
-- Respuestas de jugadores a partidos (¿voy / no voy?)
-- Ejecutar en Supabase SQL Editor (una sola vez).
-- ============================================================

create table if not exists partido_respuestas (
  id text primary key,
  "partidoId" text not null,
  "jugadorId" text not null,
  equipo text default '',
  estado text not null default 'si',
  "actualizadoEn" text default '',
  created_at timestamptz not null default now()
);

alter table partido_respuestas enable row level security;

do $$
begin
  create policy "rw partido_respuestas" on partido_respuestas
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

create index if not exists partido_respuestas_partido
  on partido_respuestas ("partidoId");

-- ============================================================
-- Comprobación:
--   select * from partido_respuestas;
-- ============================================================
