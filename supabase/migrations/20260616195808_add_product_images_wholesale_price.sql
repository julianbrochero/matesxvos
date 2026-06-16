alter table public.products
add column if not exists image_url text;

alter table public.products
add column if not exists wholesale_price numeric(12, 2);

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

notify pgrst, 'reload schema';
