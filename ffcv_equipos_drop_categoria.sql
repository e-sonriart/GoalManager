-- Elimina la columna 'categoria' de ffcv_equipos (ya no se almacena).
-- Ejecutar en el SQL Editor de Supabase.

drop index if exists ffcv_equipos_categoria_idx;
alter table ffcv_equipos drop column if exists categoria;
