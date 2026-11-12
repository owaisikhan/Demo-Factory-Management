-- Runs before every industry template (scripts/new-client.mjs puts it
-- first). It refuses to touch a database that is already in use, then
-- clears the starter lists migration 0006 created, so the template's own
-- lists are the only ones.

do $$
begin
  if exists (select 1 from public.items)
     or exists (select 1 from public.stock_movements)
     or exists (select 1 from public.sales)
     or exists (select 1 from public.purchases) then
    raise exception 'This database already has items, stock or documents. Industry templates are only for a new, empty client database; change an existing client''s lists in Settings instead.';
  end if;
end $$;

delete from public.colors;
delete from public.sizes;
delete from public.microns;
delete from public.brands;
delete from public.item_categories;
delete from public.units;
