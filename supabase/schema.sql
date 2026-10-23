-- =========================================================
--  The Make Up Girls · base de datos (Supabase, plan gratis)
--
--  Cómo usarlo: Supabase → SQL Editor → New query →
--  pega TODO este archivo → Run.
--  Se puede volver a correr sin romper nada.
-- =========================================================


-- ---------- Administradoras ----------
-- Solo los correos de esta tabla pueden editar la tienda y ver pedidos.
create table if not exists public.admins (
  email text primary key
);

insert into public.admins (email)
values ('maytelizarraosuna@gmail.com')
on conflict do nothing;

-- Sin políticas: nadie puede leer ni cambiar esta tabla desde la página.
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;


-- ---------- Categorías ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  emoji text not null default '' check (char_length(emoji) <= 16),
  position int not null default 0,
  created_at timestamptz not null default now()
);


-- ---------- Productos ----------
-- images: lista de URLs de fotos (la primera es la principal)
-- shades: tonos opcionales → [{ "name": "Rosa", "color": "#f4a", "image": "url o null" }]
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  brand text not null default '',
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  category_id uuid references public.categories (id) on delete set null,
  badge text check (badge in ('nuevo', 'viral', 'bestseller', 'oferta')),
  images text[] not null default '{}',
  shades jsonb not null default '[]'::jsonb check (jsonb_typeof(shades) = 'array'),
  status text not null default 'disponible'
    check (status in ('disponible', 'agotado', 'oculto')),
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);


-- ---------- Pedidos ----------
-- items: copia de lo que se pidió → [{ product_id, name, brand, shade, qty, price }]
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_instagram text not null default '',
  delivery text not null default '',
  notes text not null default '',
  items jsonb not null,
  total numeric(10, 2) not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'correo')),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'confirmado', 'entregado', 'cancelado')),
  created_at timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status, created_at desc);


-- ---------- Permisos (Row Level Security) ----------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Categorías: todos las ven, solo admin las edita
drop policy if exists "categorias visibles" on public.categories;
create policy "categorias visibles" on public.categories
  for select using (true);

drop policy if exists "admin edita categorias" on public.categories;
create policy "admin edita categorias" on public.categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Productos: todos ven los que no están ocultos, solo admin edita
drop policy if exists "productos visibles" on public.products;
create policy "productos visibles" on public.products
  for select using (status <> 'oculto' or public.is_admin());

drop policy if exists "admin edita productos" on public.products;
create policy "admin edita productos" on public.products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Pedidos: solo admin los ve y cambia.
-- Las clientas los crean con la función place_order (abajo).
drop policy if exists "admin maneja pedidos" on public.orders;
create policy "admin maneja pedidos" on public.orders
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ---------- Crear pedido (lo llama la tienda) ----------
-- Los precios y el total se calculan aquí con los datos reales de la base,
-- así nadie puede mandar un pedido con precios inventados.
create or replace function public.place_order(
  p_code text,
  p_customer jsonb,
  p_items jsonb,
  p_channel text default 'whatsapp'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product public.products;
  v_qty int;
  v_lines jsonb := '[]'::jsonb;
  v_total numeric(10, 2) := 0;
  v_name text := left(btrim(coalesce(p_customer ->> 'name', '')), 80);
  v_phone text := left(btrim(coalesce(p_customer ->> 'phone', '')), 20);
begin
  if p_code is null or p_code !~ '^TMG-[A-Z0-9]{4,10}$' then
    raise exception 'Código de pedido inválido';
  end if;
  if v_name = '' or char_length(v_phone) < 7 then
    raise exception 'Faltan tu nombre o tu teléfono';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception 'El carrito está vacío';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product
    from public.products
    where id::text = (v_item ->> 'product_id') and status = 'disponible';

    if not found then
      raise exception 'Uno de los productos ya no está disponible';
    end if;

    v_qty := least(99, greatest(1, coalesce((v_item ->> 'qty')::int, 1)));
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'brand', v_product.brand,
      'shade', left(coalesce(v_item ->> 'shade', ''), 80),
      'qty', v_qty,
      'price', v_product.price
    );
    v_total := v_total + v_product.price * v_qty;
  end loop;

  insert into public.orders (
    code, customer_name, customer_phone, customer_instagram,
    delivery, notes, items, total, channel
  ) values (
    p_code,
    v_name,
    v_phone,
    left(btrim(coalesce(p_customer ->> 'instagram', '')), 60),
    left(btrim(coalesce(p_customer ->> 'delivery', '')), 80),
    left(btrim(coalesce(p_customer ->> 'notes', '')), 500),
    v_lines,
    v_total,
    case when p_channel = 'correo' then 'correo' else 'whatsapp' end
  );

  return jsonb_build_object('code', p_code, 'total', v_total);
end;
$$;

grant execute on function public.place_order(text, jsonb, jsonb, text) to anon, authenticated;


-- ---------- Fotos de productos (Storage) ----------
-- Carpeta pública "productos": cualquiera ve las fotos, solo admin sube/borra.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "admin ve fotos" on storage.objects;
create policy "admin ve fotos" on storage.objects
  for select to authenticated
  using (bucket_id = 'productos' and public.is_admin());

drop policy if exists "admin sube fotos" on storage.objects;
create policy "admin sube fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and public.is_admin());

drop policy if exists "admin cambia fotos" on storage.objects;
create policy "admin cambia fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and public.is_admin());

drop policy if exists "admin borra fotos" on storage.objects;
create policy "admin borra fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'productos' and public.is_admin());
