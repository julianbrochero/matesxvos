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

  insert into public.movements (product_id, type, quantity, status, title, detail, amount, profit, date, seller, payment, paid, customer, location)
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
    nullif(trim(coalesce(p_customer, '')), ''),
    v_product.location
  );

  return jsonb_build_object('ok', true, 'amount', v_amount, 'profit', v_profit);
end;
$$;

notify pgrst, 'reload schema';
