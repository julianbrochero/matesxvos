create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  location text not null default 'Buenos Aires',
  image_url text,
  cost numeric(12, 2) not null check (cost > 0),
  price numeric(12, 2) not null check (price > 0),
  wholesale_price numeric(12, 2),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  sold integer not null default 0 check (sold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
add column if not exists location text not null default 'Buenos Aires';

alter table public.products
alter column location set default 'Buenos Aires';

alter table public.products
add column if not exists image_url text;

alter table public.products
add column if not exists wholesale_price numeric(12, 2);

update public.products
set location = case
  when lower(trim(location)) in ('villa maria', 'villamaria') then 'Villa Maria'
  when lower(trim(location)) in ('buenos aires', 'buenosaires', 'bsas') then 'Buenos Aires'
  else 'Buenos Aires'
end
where location is distinct from case
  when lower(trim(location)) in ('villa maria', 'villamaria') then 'Villa Maria'
  when lower(trim(location)) in ('buenos aires', 'buenosaires', 'bsas') then 'Buenos Aires'
  else 'Buenos Aires'
end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_location_valid'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
    add constraint products_location_valid
    check (location in ('Buenos Aires', 'Villa Maria'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_wholesale_price_positive'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
    add constraint products_wholesale_price_positive
    check (wholesale_price is null or wholesale_price > 0);
  end if;
end;
$$;

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  type text not null check (type in ('compra', 'venta', 'stock', 'producto')),
  quantity integer check (quantity is null or quantity > 0),
  status text check (status in ('pendiente', 'entregado', 'cancelado')),
  title text not null,
  detail text not null,
  amount numeric(12, 2) not null default 0,
  profit numeric(12, 2) not null default 0,
  date date not null default current_date,
  seller text,
  payment text,
  customer text,
  paid boolean not null default true,
  group_id uuid,
  location text,
  created_at timestamptz not null default now()
);

alter table public.movements
add column if not exists status text check (status in ('pendiente', 'entregado', 'cancelado'));

alter table public.movements
add column if not exists quantity integer check (quantity is null or quantity > 0);

alter table public.movements
add column if not exists paid boolean default true;

alter table public.movements
add column if not exists customer text;

alter table public.movements
add column if not exists group_id uuid;

create index if not exists movements_group_id_idx on public.movements (group_id);

update public.movements
set paid = true
where paid is null;

alter table public.movements
alter column paid set default true;

alter table public.movements
alter column paid set not null;

update public.movements
set status = 'entregado'
where type = 'venta' and status is null;

alter table public.movements
add column if not exists location text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'movements_location_valid'
      and conrelid = 'public.movements'::regclass
  ) then
    alter table public.movements
    add constraint movements_location_valid
    check (location is null or location in ('Buenos Aires', 'Villa Maria'));
  end if;
end;
$$;

-- Backfill: copia la ubicación actual del producto a cada movimiento existente
-- que todavía no tenga una ubicación propia guardada.
update public.movements m
set location = p.location
from public.products p
where m.location is null
  and m.product_id = p.id;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

create or replace function public.register_purchase(
  p_product_id uuid,
  p_quantity integer,
  p_unit_cost numeric,
  p_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_amount numeric(12, 2);
begin
  if p_quantity <= 0 or p_unit_cost <= 0 then
    raise exception 'Datos de compra inválidos';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Producto no encontrado';
  end if;

  v_amount := p_quantity * p_unit_cost;

  update public.products
  set stock = stock + p_quantity,
      cost = p_unit_cost
  where id = p_product_id;

  insert into public.movements (product_id, type, quantity, title, detail, amount, profit, date, location)
  values (
    p_product_id,
    'compra',
    p_quantity,
    'Compra registrada',
    p_quantity || ' ' || v_product.name || ' ingresaron al stock',
    v_amount,
    0,
    p_date,
    v_product.location
  );

  return jsonb_build_object('ok', true, 'amount', v_amount);
end;
$$;

drop function if exists public.register_sale(uuid, integer, text, text, date, text, numeric, boolean, text);
drop function if exists public.register_sale(uuid, integer, text, text, date, text, numeric, boolean);
drop function if exists public.register_sale(uuid, integer, text, text, date, text, numeric);
drop function if exists public.register_sale(uuid, integer, text, text, date, text);

create or replace function public.register_sale(
  p_product_id uuid,
  p_quantity integer,
  p_seller text,
  p_payment text,
  p_date date,
  p_status text default 'entregado',
  p_unit_price numeric default null,
  p_paid boolean default true,
  p_customer text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_unit_price numeric(12, 2);
  v_amount numeric(12, 2);
  v_profit numeric(12, 2);
begin
  if p_quantity <= 0 then
    raise exception 'Cantidad inválida';
  end if;

  if p_status not in ('pendiente', 'entregado', 'cancelado') then
    raise exception 'Estado inválido';
  end if;

  if p_unit_price is not null and p_unit_price <= 0 then
    raise exception 'Precio inválido';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Producto no encontrado';
  end if;

  if v_product.stock < p_quantity then
    raise exception 'Stock insuficiente';
  end if;

  v_unit_price := coalesce(p_unit_price, v_product.price);
  v_amount := v_unit_price * p_quantity;
  v_profit := (v_unit_price - v_product.cost) * p_quantity;

  update public.products
  set stock = stock - p_quantity,
      sold = sold + p_quantity
  where id = p_product_id;

  insert into public.movements (product_id, type, quantity, status, title, detail, amount, profit, date, seller, payment, paid, customer)
  values (
    p_product_id,
    'venta',
    p_quantity,
    p_status,
    'Venta registrada',
    p_quantity || ' ' || v_product.name || ' por ' || p_payment,
    v_amount,
    v_profit,
    p_date,
    p_seller,
    p_payment,
    coalesce(p_paid, true),
    nullif(trim(coalesce(p_customer, '')), '')
  );

  return jsonb_build_object('ok', true, 'amount', v_amount, 'profit', v_profit);
end;
$$;

drop function if exists public.register_sale_batch(jsonb, text, text, date, text, boolean, text);

create or replace function public.register_sale_batch(
  p_items jsonb,
  p_seller text,
  p_payment text,
  p_date date,
  p_status text default 'entregado',
  p_paid boolean default true,
  p_customer text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid := gen_random_uuid();
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price numeric(12, 2);
  v_unit_cost numeric(12, 2);
  v_amount numeric(12, 2);
  v_profit numeric(12, 2);
  v_total_amount numeric(12, 2) := 0;
  v_total_profit numeric(12, 2) := 0;
  v_item_count integer := 0;
begin
  if p_status not in ('pendiente', 'entregado', 'cancelado') then
    raise exception 'Estado inválido';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta necesita al menos un producto';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'productId')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    select * into v_product from public.products where id = v_product_id for update;
    if not found then
      raise exception 'Producto no encontrado';
    end if;

    if v_product.stock < v_quantity then
      raise exception 'Stock insuficiente: %', v_product.name;
    end if;

    v_unit_price := coalesce((v_item->>'unitPrice')::numeric, v_product.price);
    if v_unit_price <= 0 then
      raise exception 'Precio inválido';
    end if;

    v_unit_cost := coalesce(nullif((v_item->>'unitCost')::numeric, 0), v_product.cost);
    v_amount := v_unit_price * v_quantity;
    v_profit := (v_unit_price - v_unit_cost) * v_quantity;

    update public.products
    set stock = stock - v_quantity,
        sold = sold + v_quantity
    where id = v_product_id;

    insert into public.movements (product_id, type, quantity, status, title, detail, amount, profit, date, seller, payment, paid, customer, group_id, location)
    values (
      v_product_id,
      'venta',
      v_quantity,
      p_status,
      'Venta registrada',
      v_quantity || ' ' || v_product.name || ' por ' || p_payment,
      v_amount,
      v_profit,
      p_date,
      p_seller,
      p_payment,
      coalesce(p_paid, true),
      nullif(trim(coalesce(p_customer, '')), ''),
      v_group_id,
      v_product.location
    );

    v_total_amount := v_total_amount + v_amount;
    v_total_profit := v_total_profit + v_profit;
    v_item_count := v_item_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'groupId', v_group_id, 'amount', v_total_amount, 'profit', v_total_profit, 'items', v_item_count);
end;
$$;

insert into public.products (name, brand, location, cost, price, wholesale_price, stock, min_stock, sold)
select *
from (
  values
    ('Baldo 1kg', 'Baldo', 'Buenos Aires', 12000, 17000, 15500, 34, 8, 42),
    ('Canarias Serena 1kg', 'Canarias', 'Villa Maria', 10800, 15800, 14500, 18, 10, 31),
    ('Playadito 1kg', 'Playadito', 'Buenos Aires', 7200, 11200, 10100, 46, 12, 55),
    ('La Merced Campo 500g', 'La Merced', 'Villa Maria', 5400, 8200, 7500, 12, 8, 18),
    ('Sara Tradicional 1kg', 'Sara', 'Buenos Aires', 9800, 14500, 13200, 7, 9, 22),
    ('Rei Verde Export 1kg', 'Rei Verde', 'Villa Maria', 11500, 16900, 15400, 15, 6, 15)
) as seed(name, brand, location, cost, price, wholesale_price, stock, min_stock, sold)
where not exists (select 1 from public.products);

insert into public.movements (type, status, title, detail, amount, profit, date, seller, payment, paid, location)
select *
from (
  values
    ('venta', 'entregado', 'Venta registrada', '3 Baldo 1kg por Mercado Pago', 51000, 15000, current_date, 'Julian', 'Mercado Pago', true, 'Buenos Aires'),
    ('compra', null, 'Ingreso de mercadería', '20 Playadito 1kg al stock', 144000, 0, current_date - 1, null, null, true, 'Buenos Aires'),
    ('venta', 'entregado', 'Venta registrada', '2 Canarias Serena 1kg en efectivo', 31600, 10000, current_date - 2, 'Santiago', 'Efectivo', false, 'Villa Maria')
) as seed(type, status, title, detail, amount, profit, date, seller, payment, paid, location)
where not exists (select 1 from public.movements);

notify pgrst, 'reload schema';
