create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  cost numeric(12, 2) not null check (cost > 0),
  price numeric(12, 2) not null check (price > 0),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  sold integer not null default 0 check (sold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  type text not null check (type in ('compra', 'venta', 'stock', 'producto')),
  title text not null,
  detail text not null,
  amount numeric(12, 2) not null default 0,
  profit numeric(12, 2) not null default 0,
  date date not null default current_date,
  seller text,
  payment text,
  created_at timestamptz not null default now()
);

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

  insert into public.movements (product_id, type, title, detail, amount, profit, date)
  values (
    p_product_id,
    'compra',
    'Compra registrada',
    p_quantity || ' ' || v_product.name || ' ingresaron al stock',
    v_amount,
    0,
    p_date
  );

  return jsonb_build_object('ok', true, 'amount', v_amount);
end;
$$;

create or replace function public.register_sale(
  p_product_id uuid,
  p_quantity integer,
  p_seller text,
  p_payment text,
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
  v_profit numeric(12, 2);
begin
  if p_quantity <= 0 then
    raise exception 'Cantidad inválida';
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

  v_amount := v_product.price * p_quantity;
  v_profit := (v_product.price - v_product.cost) * p_quantity;

  update public.products
  set stock = stock - p_quantity,
      sold = sold + p_quantity
  where id = p_product_id;

  insert into public.movements (product_id, type, title, detail, amount, profit, date, seller, payment)
  values (
    p_product_id,
    'venta',
    'Venta registrada',
    p_quantity || ' ' || v_product.name || ' por ' || p_payment,
    v_amount,
    v_profit,
    p_date,
    p_seller,
    p_payment
  );

  return jsonb_build_object('ok', true, 'amount', v_amount, 'profit', v_profit);
end;
$$;

insert into public.products (name, brand, cost, price, stock, min_stock, sold)
select *
from (
  values
    ('Baldo 1kg', 'Baldo', 12000, 17000, 34, 8, 42),
    ('Canarias Serena 1kg', 'Canarias', 10800, 15800, 18, 10, 31),
    ('Playadito 1kg', 'Playadito', 7200, 11200, 46, 12, 55),
    ('La Merced Campo 500g', 'La Merced', 5400, 8200, 12, 8, 18),
    ('Sara Tradicional 1kg', 'Sara', 9800, 14500, 7, 9, 22),
    ('Rei Verde Export 1kg', 'Rei Verde', 11500, 16900, 15, 6, 15)
) as seed(name, brand, cost, price, stock, min_stock, sold)
where not exists (select 1 from public.products);

insert into public.movements (type, title, detail, amount, profit, date, seller, payment)
select *
from (
  values
    ('venta', 'Venta registrada', '3 Baldo 1kg por Mercado Pago', 51000, 15000, current_date, 'Julian', 'Mercado Pago'),
    ('compra', 'Ingreso de mercadería', '20 Playadito 1kg al stock', 144000, 0, current_date - 1, null, null),
    ('venta', 'Venta registrada', '2 Canarias Serena 1kg en efectivo', 31600, 10000, current_date - 2, 'Santiago', 'Efectivo')
) as seed(type, title, detail, amount, profit, date, seller, payment)
where not exists (select 1 from public.movements);
