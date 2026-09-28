-- ============================================================
-- Notificaciones push (Web Push) — GoalManager
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (junto a supabase-schema.sql).
-- ============================================================

-- 1) Dispositivos suscritos a los avisos push (una fila por navegador)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_tipo text not null default 'jugador', -- 'jugador' | 'staff'
  user_id text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_usuario
  on push_subscriptions (user_tipo, user_id);

-- Si el proyecto tiene RLS activado por defecto en tablas nuevas, la app
-- (que trabaja con la anon key) necesita permiso explícito:
alter table push_subscriptions enable row level security;
do $$
begin
  create policy "push_subscriptions_anon" on push_subscriptions
    for all to anon, authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- 2) Historial de avisos enviados. El índice único evita repetir
--    los recordatorios (mismo usuario + tipo + referencia).
create table if not exists notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_tipo text not null,
  user_id text not null,
  tipo text not null, -- convocatoria | horario | resultado | recordatorio24 | recordatorio2
  ref_id text not null default '',
  titulo text not null,
  cuerpo text,
  url text not null default '/',
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists notificaciones_unico
  on notificaciones (user_tipo, user_id, tipo, ref_id);

create index if not exists notificaciones_usuario
  on notificaciones (user_tipo, user_id, created_at desc);

alter table notificaciones enable row level security;
do $$
begin
  create policy "notificaciones_anon" on notificaciones
    for all to anon, authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- 3) Programador: cada 5 minutos llama a /api/cron (recordatorios 24 h / 2 h)
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('goalmanager_recordatorios');
exception when others then null;
end $$;

select cron.schedule(
  'goalmanager_recordatorios',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://goal-manager-zeta.vercel.app/api/cron?secret=gmpush_4f7a9c2e',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $job$
);

-- ============================================================
-- Comprobaciones:
--   select jobname, schedule, command from cron.job where jobname = 'goalmanager_recordatorios';
--   select * from cron.job_run_details order by start_time desc limit 5;
-- Desprogramar:
--   select cron.unschedule('goalmanager_recordatorios');
-- ============================================================
