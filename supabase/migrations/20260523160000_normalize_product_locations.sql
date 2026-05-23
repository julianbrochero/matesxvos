alter table public.products
add column if not exists location text not null default 'Buenos Aires';

alter table public.products
alter column location set default 'Buenos Aires';

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
