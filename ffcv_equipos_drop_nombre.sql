-- Elimina la columna 'nombre' de ffcv_equipos (ahora la fila es por club+campo).
-- Ejecutar en el SQL Editor de Supabase ANTES de volver a lanzar el script.

drop index if exists ffcv_equipos_nombre_idx;
alter table ffcv_equipos drop column if exists nombre;
