-- Create config table
create table public.config (
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
  about_history jsonb, -- Array of history items

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

  -- Theme Colors Section
  theme_colors jsonb default '{"hero":{"bg":"bg-navyDark","text":"text-white"},"about":{"bg":"bg-pullmanBrown","text":"text-white"},"showcase":{"bg":"bg-navyDark","text":"text-white"},"contact":{"bg":"bg-navyDark","text":"text-white"},"footer":{"bg":"bg-pullmanBrown","text":"text-white"}}'::jsonb,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.config enable row level security;

-- Allow public read
create policy "Public config is viewable by everyone"
  on config for select
  using ( true );

-- Allow authenticated (or anon for now per project style) to update
-- Ideally this should be restricted to admin only
create policy "Allow updates to config"
  on config for update
  using ( true )
  with check ( true );

create policy "Allow inserts to config"
  on config for insert
  with check ( true );
