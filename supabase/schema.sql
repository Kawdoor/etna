-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PRODUCTS
create table if not exists public.products (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  category text not null,
  description text,
  "longDescription" text,
  price numeric,
  featured boolean default false,
  image text,
  gallery jsonb default '[]'::jsonb,
  tag text,
  specs jsonb default '[]'::jsonb
);

alter table public.products enable row level security;

-- Policies for products (drop first to avoid errors on re-run)
drop policy if exists "Public read access" on public.products;
create policy "Public read access" on public.products for select using (true);

drop policy if exists "Authenticated admin access" on public.products;
create policy "Authenticated admin access" on public.products for all using (true) with check (true);

-- 2. CONSULTATIONS
create table if not exists public.consultations (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  "customerName" text not null,
  "productName" text,
  query text not null,
  status text default 'pending' check (status in ('pending', 'responded'))
);

alter table public.consultations enable row level security;

drop policy if exists "Public insert consultations" on public.consultations;
create policy "Public insert consultations" on public.consultations for insert with check (true);

drop policy if exists "Authenticated admin consultations" on public.consultations;
create policy "Authenticated admin consultations" on public.consultations for all using (true) with check (true);

-- 3. ORDERS
create table if not exists public.orders (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  "firstName" text not null,
  "lastName" text not null,
  email text not null,
  address text,
  status text default 'pending' check (status in ('pending', 'processed', 'shipped', 'delivered', 'cancelled'))
);

alter table public.orders enable row level security;

drop policy if exists "Public insert orders" on public.orders;
create policy "Public insert orders" on public.orders for insert with check (true);

drop policy if exists "Authenticated admin orders" on public.orders;
create policy "Authenticated admin orders" on public.orders for all using (true) with check (true);

-- 4. SALE ITEMS (Order Items)
create table if not exists public.sale_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  quantity integer default 1,
  price numeric
);

alter table public.sale_items enable row level security;

drop policy if exists "Public insert sale_items" on public.sale_items;
create policy "Public insert sale_items" on public.sale_items for insert with check (true);

drop policy if exists "Authenticated admin sale_items" on public.sale_items;
create policy "Authenticated admin sale_items" on public.sale_items for select using (true);


-- NOTA IMPORTANTE:
-- Si usas Supabase Cloud, el schema y las tablas del sistema 'storage' ya existen y no tienes permisos para crearlas.
-- Si usas Postgres local, puedes descomentar las siguientes líneas para crear el schema y la tabla si no existen.
-- Por defecto, el script solo intentará insertar el bucket si existe la tabla.
--
-- CREATE SCHEMA IF NOT EXISTS storage;
-- CREATE TABLE IF NOT EXISTS storage.buckets (
--   id text primary key,
--   name text not null,
--   public boolean default false
-- );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

drop policy if exists "Public view access" on storage.objects;
create policy "Public view access" on storage.objects for select using ( bucket_id = 'products' );

drop policy if exists "Authenticated upload access" on storage.objects;
create policy "Authenticated upload access" on storage.objects for insert with check ( bucket_id = 'products' );

drop policy if exists "Authenticated update access" on storage.objects;
create policy "Authenticated update access" on storage.objects for update using ( bucket_id = 'products' );

drop policy if exists "Authenticated delete access" on storage.objects;
create policy "Authenticated delete access" on storage.objects for delete using ( bucket_id = 'products' );
