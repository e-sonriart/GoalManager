-- ============================================================
-- Mapa FFCV: (categoria, division, grupo, letra) → cod_grupo
-- OPCIONAL: sin esta tabla la resolución funciona igual, solo
-- que se repite la búsqueda en FFCV cada vez que se consulta.
-- Ejecutar en Supabase SQL Editor (una sola vez).
-- ============================================================

create table if not exists ffcv_grupos (
  key text primary key,
  categoria text default '',
  division text default '',
  grupo text default '',
  letra text default '',
  cod_grupo text not null,
  competicion text default '',
  grupo_ffcv text default '',
  temporada text default '',
  updated_at timestamptz not null default now()
);

alter table ffcv_grupos enable row level security;

do $$
begin
  create policy "rw ffcv_grupos" on ffcv_grupos
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- ============================================================
-- Comprobaciones:
--   select * from ffcv_grupos order by updated_at desc;
-- ============================================================
