
-- 1. Tabla de favoritos
CREATE TABLE IF NOT EXISTS public.favoritos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    juego_api_id    TEXT NOT NULL,
    titulo          TEXT NOT NULL,
    precio_alerta   NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    fecha_guardado  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para acelerar consultas por usuario
CREATE INDEX IF NOT EXISTS idx_favoritos_usuario_id ON public.favoritos(usuario_id);

-- 2. Row Level Security (RLS) — cada usuario solo ve sus propios registros
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

-- Política: SELECT — el usuario solo puede ver sus propios favoritos
CREATE POLICY "Usuario ve sus favoritos"
    ON public.favoritos
    FOR SELECT
    USING (auth.uid() = usuario_id);

-- Política: INSERT — el usuario solo puede insertar con su propio usuario_id
CREATE POLICY "Usuario crea sus favoritos"
    ON public.favoritos
    FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

-- Política: DELETE — el usuario solo puede borrar sus propios favoritos
CREATE POLICY "Usuario borra sus favoritos"
    ON public.favoritos
    FOR DELETE
    USING (auth.uid() = usuario_id);

-- 3. Comentarios descriptivos en columnas
COMMENT ON TABLE  public.favoritos               IS 'Juegos guardados como favoritos por cada usuario autenticado';
COMMENT ON COLUMN public.favoritos.juego_api_id  IS 'ID numérico del juego según la API de CheapShark (campo gameID)';
COMMENT ON COLUMN public.favoritos.precio_alerta IS 'Precio máximo al que el usuario quiere ser alertado (en USD)';
