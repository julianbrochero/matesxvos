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
  v_custom_name text;
  v_detail_name text;
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
    v_product_id := nullif(v_item->>'productId', '')::uuid;
    v_custom_name := nullif(trim(coalesce(v_item->>'customName', '')), '');
    v_quantity := (v_item->>'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    if v_product_id is not null then
      select * into v_product from public.products where id = v_product_id for update;
      if not found then
        raise exception 'Producto no encontrado';
      end if;

      if v_product.stock < v_quantity then
        raise exception 'Stock insuficiente: %', v_product.name;
      end if;

      v_unit_price := coalesce((v_item->>'unitPrice')::numeric, v_product.price);
      v_unit_cost := coalesce(nullif((v_item->>'unitCost')::numeric, 0), v_product.cost);
      v_detail_name := v_product.name;

      update public.products
      set stock = stock - v_quantity,
          sold = sold + v_quantity
      where id = v_product_id;
    else
      if v_custom_name is null then
        raise exception 'El producto personalizado necesita un nombre';
      end if;

      v_unit_price := (v_item->>'unitPrice')::numeric;
      v_unit_cost := coalesce((v_item->>'unitCost')::numeric, 0);
      v_detail_name := v_custom_name;
    end if;

    if v_unit_price is null or v_unit_price <= 0 then
      raise exception 'Precio inválido';
    end if;

    v_amount := v_unit_price * v_quantity;
    v_profit := (v_unit_price - v_unit_cost) * v_quantity;

    insert into public.movements (product_id, type, quantity, status, title, detail, amount, profit, date, seller, payment, paid, customer, group_id)
    values (
      v_product_id,
      'venta',
      v_quantity,
      p_status,
      'Venta registrada',
      v_quantity || ' ' || v_detail_name || ' por ' || p_payment,
      v_amount,
      v_profit,
      p_date,
      p_seller,
      p_payment,
      coalesce(p_paid, true),
      nullif(trim(coalesce(p_customer, '')), ''),
      v_group_id
    );

    v_total_amount := v_total_amount + v_amount;
    v_total_profit := v_total_profit + v_profit;
    v_item_count := v_item_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'groupId', v_group_id, 'amount', v_total_amount, 'profit', v_total_profit, 'items', v_item_count);
end;
$$;

notify pgrst, 'reload schema';
