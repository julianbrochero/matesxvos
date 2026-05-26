alter table public.movements
add column if not exists paid boolean not null default true;

update public.movements
set paid = true
where type = 'venta' and paid is null;

drop function if exists public.register_sale(uuid, integer, text, text, date, text, numeric);

create or replace function public.register_sale(
  p_product_id uuid,
  p_quantity integer,
  p_seller text,
  p_payment text,
  p_date date,
  p_status text default 'entregado',
  p_unit_price numeric default null,
  p_paid boolean default true
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

  insert into public.movements (product_id, type, quantity, status, title, detail, amount, profit, date, seller, payment, paid)
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
    coalesce(p_paid, true)
  );

  return jsonb_build_object('ok', true, 'amount', v_amount, 'profit', v_profit);
end;
$$;
