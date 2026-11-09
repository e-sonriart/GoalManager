-- Horarios habituales de entrenamiento por equipo.
-- Ejecutar una vez en el SQL Editor de Supabase para que los horarios se
-- compartan entre todos los dispositivos y entrenadores.
-- Mientras no se ejecute, la app guarda los horarios en el propio dispositivo.

create table if not exists horarios_entrenamiento (
  id text primary key,
  equipo text,
  categoria text,
  tipo text,
  dias jsonb default '[]'::jsonb,
  hora text,
  "horaFin" text,
  lugar text,
  titulo text,
  objetivo text,
  descripcion text,
  "actualizadoEn" text
);

alter table horarios_entrenamiento enable row level security;

drop policy if exists "rw horarios_entrenamiento" on horarios_entrenamiento;
create policy "rw horarios_entrenamiento" on horarios_entrenamiento
  for all using (true) with check (true);
