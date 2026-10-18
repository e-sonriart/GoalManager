-- ============================================================
-- Hoja de datos de VESTUARIO (tallas por prenda, nombre/número
-- de camiseta, fechas de solicitud/entrega y pago) y su catálogo
-- de prendas (tallas y precio), más la hoja de CAJA.
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
  estado text default 'pendiente',   -- pendiente | entregado | sin_stock
  pagado boolean default false,      -- icono de dinero: gris = no pagado, amarillo = pagado
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

-- Precio de cada prenda en euros (lo añade el rol caja)
alter table vestuario_tipos add column if not exists precio text default '';

-- Estado de entrega y pago por prenda (si la tabla ya existía)
alter table vestuario add column if not exists estado text default 'pendiente';
alter table vestuario add column if not exists pagado boolean default false;

-- Fechas automáticas de la hoja: solicitud (cuando se pide) y entrega (al marcar Entregado)
alter table vestuario add column if not exists "fechaSolicitud" text default '';
alter table vestuario add column if not exists "fechaEntrega" text default '';

-- ------------------------------------------------------------
-- 3c) Hoja de CAJA: importes por jugador (solo rol caja)
--     matrícula, temporada, ropa nuevo, ropa renovación y total,
--     más el cobro de cada apartado (pagos) y los importes
--     por defecto (cajaDef* en club_config)
-- ------------------------------------------------------------
create table if not exists caja (
  id text primary key,
  "jugadorId" text not null,
  matricula text default '',
  temporada text default '',
  "ropaNuevo" text default '',
  "ropaRenovacion" text default '',
  total text default '',
  "actualizadoEn" text default '',
  created_at timestamptz not null default now()
);

alter table caja enable row level security;

do $$
begin
  create policy "rw caja" on caja
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- Una sola ficha de caja por jugador
create unique index if not exists caja_jugador
  on caja ("jugadorId");

-- Cobro por apartado: tipo de pago (efectivo/transferencia/tarjeta), casilla de
-- pagado, día e importe cobrado (JSON con la clave del apartado: matricula,
-- temporada, ropaNuevo, ropaRenovacion)
alter table caja add column if not exists pagos text default '';

-- Importes por defecto de la hoja de caja (los fija el rol Caja)
do $$
begin
  begin
    alter table club_config add column if not exists "cajaDefMatricula" text default '';
  exception when undefined_table then null; when duplicate_column then null;
  end;
  begin
    alter table club_config add column if not exists "cajaDefTemporada" text default '';
  exception when undefined_table then null; when duplicate_column then null;
  end;
  begin
    alter table club_config add column if not exists "cajaDefRopaNuevo" text default '';
  exception when undefined_table then null; when duplicate_column then null;
  end;
  begin
    alter table club_config add column if not exists "cajaDefRopaRenovacion" text default '';
  exception when undefined_table then null; when duplicate_column then null;
  end;
end $$;

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
--   select * from caja;
-- ============================================================
