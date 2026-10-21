-- Suspensión de partidos y entrenamientos con motivo (temporal o definitiva)
-- Ejecutar una vez en el SQL Editor de Supabase (idempotente).
-- - suspendido: marca de suspensión activa
-- - suspensionMotivo: mensaje que ven los jugadores (ej: "El campo está inundado")
-- - suspensionHasta: fecha/hora de reanudación; vacío = suspensión definitiva

alter table partidos add column if not exists "suspendido" boolean default false;
alter table partidos add column if not exists "suspensionMotivo" text default '';
alter table partidos add column if not exists "suspensionHasta" text default '';

alter table sesiones add column if not exists "suspendido" boolean default false;
alter table sesiones add column if not exists "suspensionMotivo" text default '';
alter table sesiones add column if not exists "suspensionHasta" text default '';
