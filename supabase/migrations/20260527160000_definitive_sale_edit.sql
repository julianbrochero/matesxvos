alter table public.movements
add column if not exists customer text;

drop function if exists public.update_sale_details(uuid, text, text, date, text, boolean, text, boolean);

create or replace function public.update_sale_details(
  p_movement_id uuid,
  p_seller text default null,
  p_payment text default null,
  p_date date default null,
  p_status text default null,
  p_paid boolean default null,
  p_customer text default null,
  p_clear_customer boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.movements%rowtype;
begin
  if p_status is not null and p_status not in ('pendiente', 'entregado', 'cancelado') then
    raise exception 'Estado inválido';
  end if;

  update public.movements
  set seller = coalesce(nullif(trim(coalesce(p_seller, '')), ''), seller),
      payment = coalesce(nullif(trim(coalesce(p_payment, '')), ''), payment),
      date = coalesce(p_date, date),
      status = coalesce(p_status, status),
      paid = coalesce(p_paid, paid),
      customer = case
        when p_clear_customer then null
        when p_customer is not null then nullif(trim(p_customer), '')
        else customer
      end
  where id = p_movement_id
    and type = 'venta'
  returning * into v_sale;

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_sale.id,
    'customer', v_sale.customer,
    'status', v_sale.status,
    'paid', v_sale.paid
  );
end;
$$;

notify pgrst, 'reload schema';
