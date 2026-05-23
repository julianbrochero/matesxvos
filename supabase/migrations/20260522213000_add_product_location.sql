alter table public.products
add column if not exists location text not null default '';

update public.products
set location = brand
where location = '';
