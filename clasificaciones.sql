-- ============================================================
-- Caché de clasificaciones FFCV (anti-bloqueo) + cron semanal
-- Ejecutar en Supabase SQL Editor (una sola vez).
-- ============================================================

-- 1) Tabla: snapshot de la clasificación extraída de FFCV por url
create table if not exists clasificaciones (
  url text primary key,
  competicion text default '',
  grupo text default '',
  jornada text default '',
  fecha_jornada text default '',
  rows jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table clasificaciones enable row level security;

do $$
begin
  create policy "rw clasificaciones" on clasificaciones
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- 2) Programador: cada lunes 06:00 UTC (08:00 en verano) refresca
--    todos los links guardados en equipos."linkClasificacion"
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('goalmanager_clasificaciones');
exception when others then null;
end $$;

select cron.schedule(
  'goalmanager_clasificaciones',
  '0 6 * * 1',
  $job$
  select net.http_post(
    url := 'https://goal-manager-zeta.vercel.app/api/actualizar-clasificaciones?secret=gmpush_4f7a9c2e',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $job$
);

-- ============================================================
-- Comprobaciones:
--   select * from clasificaciones;
--   select jobname, schedule, command from cron.job where jobname = 'goalmanager_clasificaciones';
-- Desprogramar:
--   select cron.unschedule('goalmanager_clasificaciones');
-- ============================================================
