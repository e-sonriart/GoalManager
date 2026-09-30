-- ============================================================
-- Añade el estado "Partido Suspendido" a la tabla partidos.
-- Ejecutar en Supabase SQL Editor (una sola vez).
-- ============================================================

alter table partidos add column if not exists suspendido boolean default false;

-- ============================================================
-- Comprobación:
--   select id, suspendido from partidos limit 5;
-- ============================================================
