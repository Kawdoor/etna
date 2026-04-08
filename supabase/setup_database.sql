-- Drop table if you need to reset completely (Optional)
-- DROP TABLE IF EXISTS public.config;

-- Create config table
CREATE TABLE IF NOT EXISTS public.config (
  id serial primary key,
  site_name text default 'ETNA',
  site_description text default 'Iluminación de Vanguardia',
  contact_email text default 'contact@etna.com',
  contact_phone text default '+54 9 11 1234 5678',
  opening_hours text default 'Lun - Vie: 10:00 - 19:00',
  theme text default 'dark',
  ai_active boolean default true,
  use_mock_data boolean default true,
  
  -- Hero Section
  hero_headline text,
  hero_subheadline text,
  hero_text text,
  hero_image_url text,

  -- About Section
  about_headline text,
  about_description text,
  about_image_url text,
  about_history jsonb,

  -- Catalog Section
  catalog_headline text,
  catalog_description text,
  catalog_headline_full text,
  catalog_description_full text,
  collection_hero_headline text,
  collection_hero_subheadline text,
  collection_hero_image_url text,

  -- Contact Section
  contact_headline text,
  contact_subheadline text,
  contact_address text,
  contact_map_url text,

  -- Vision Section
  vision_text text,
  vision_image_url text,

  -- AI Simulation Section
  ai_simulation_subtitle text,
  ai_simulation_title text,
  ai_simulation_quote text,
  ai_simulation_body text,
  ai_simulation_badge text,

  -- Theme Colors Section
  theme_colors jsonb default '{"hero":{"bg":"bg-navyDark","text":"text-white"},"about":{"bg":"bg-pullmanBrown","text":"text-white"},"showcase":{"bg":"bg-navyDark","text":"text-white"},"contact":{"bg":"bg-navyDark","text":"text-white"},"footer":{"bg":"bg-pullmanBrown","text":"text-white"}}'::jsonb,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Seguridad a Nivel de Filas)
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Evitar errores si las políticas ya existen
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public config is viewable by everyone" ON public.config;
    DROP POLICY IF EXISTS "Allow updates to config" ON public.config;
    DROP POLICY IF EXISTS "Allow inserts to config" ON public.config;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Política de Lectura (Pública)
CREATE POLICY "Public config is viewable by everyone"
  ON public.config FOR SELECT
  USING ( true );

-- Política de Actualización (Permitir a todos / Anon para este proyecto)
CREATE POLICY "Allow updates to config"
  ON public.config FOR UPDATE
  USING ( true )
  WITH CHECK ( true );

-- Política de Inserción
CREATE POLICY "Allow inserts to config"
  ON public.config FOR INSERT
  WITH CHECK ( true );

-- ¡IMPORTANTE! Insertar la fila de configuración inicial si la tabla está vacía
INSERT INTO public.config (id, site_name)
SELECT 1, 'ETNA'
WHERE NOT EXISTS (SELECT 1 FROM public.config WHERE id = 1);
