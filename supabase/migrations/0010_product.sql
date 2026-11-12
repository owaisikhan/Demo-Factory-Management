-- 0010 product: the same database now serves any small factory, not only
-- a tape maker.
-- 1. Item fields are configurable. Settings decides whether items have a
--    size, a thickness (the old "micron"), a colour/type and a pack count,
--    and what each is called. The defaults are the old tape words, so an
--    existing client sees no change; an industry template sets new words.
-- 2. A size can have a third dimension (height), and its label uses the
--    units chosen in Settings (mm, in, cm, yd...).
-- 3. The sign-in page can show the company name before anyone signs in
--    (app_branding), without opening the settings table to the public.
-- 4. New databases start with neutral company details instead of the
--    first client's.

-- ---------------------------------------------------------------
-- 1. Item field settings
-- ---------------------------------------------------------------
alter table public.settings
  add column industry_template   text not null default 'packaging-tape',
  add column size_enabled        boolean not null default true,
  add column size_label          text not null default 'Size',
  add column size_width_label    text not null default 'Width',
  add column size_width_unit     text not null default 'mm',
  add column size_length_label   text not null default 'Length',
  add column size_length_unit    text not null default 'yd',
  add column size_height_enabled boolean not null default false,
  add column size_height_label   text not null default 'Height',
  add column size_height_unit    text not null default 'mm',
  add column micron_enabled      boolean not null default true,
  add column micron_label        text not null default 'Micron',
  add column micron_unit         text not null default 'micron',
  add column color_enabled       boolean not null default true,
  add column color_label         text not null default 'Color / type',
  add column pack_enabled        boolean not null default true,
  add column pack_label          text not null default 'Rolls per carton',
  add column pack_unit           text not null default 'rolls/ctn';

alter table public.settings
  add constraint settings_item_labels_present check (
    length(trim(size_label)) > 0 and length(trim(size_width_label)) > 0 and
    length(trim(size_length_label)) > 0 and length(trim(size_height_label)) > 0 and
    length(trim(micron_label)) > 0 and length(trim(color_label)) > 0 and
    length(trim(pack_label)) > 0
  );

-- ---------------------------------------------------------------
-- 2. Sizes: optional height, label from the Settings units
-- ---------------------------------------------------------------
alter table public.sizes
  add column height_mm numeric(8,2) check (height_mm is null or height_mm > 0);

alter table public.sizes drop constraint sizes_width_mm_length_yd_key;
create unique index sizes_dimensions_key
  on public.sizes (width_mm, length_yd, coalesce(height_mm, 0));

-- The label was generated from fixed "mm" and "yd". It becomes a plain
-- column kept up to date by a trigger, so the units can change.
alter table public.sizes alter column label drop expression;

create or replace function public.size_label(p_width numeric, p_length numeric, p_height numeric)
returns text
language sql stable security definer set search_path = public
as $$
  select public.fmt_qty(p_width) || s.size_width_unit || ' x ' ||
         public.fmt_qty(p_length) || s.size_length_unit ||
         case when p_height is not null then ' x ' || public.fmt_qty(p_height) || s.size_height_unit else '' end
  from public.settings s where s.id = 1
$$;

create or replace function public.sizes_set_label()
returns trigger
language plpgsql
as $$
begin
  new.label := coalesce(public.size_label(new.width_mm, new.length_yd, new.height_mm), new.label);
  return new;
end $$;

create trigger sizes_label before insert or update on public.sizes
  for each row execute function public.sizes_set_label();

-- When the units change in Settings, every size label is rewritten. Those
-- rewrites are not separate activity entries: the settings entry already
-- says the units changed. A person's own edit of a size runs at depth 0 and
-- is still logged.
drop trigger sizes_activity on public.sizes;
create trigger sizes_activity after insert or update or delete on public.sizes
  for each row when (pg_trigger_depth() = 0) execute function public.log_activity();

create or replace function public.settings_relabel_sizes()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.sizes set label = public.size_label(width_mm, length_yd, height_mm);
  return null;
end $$;

create trigger settings_relabel_sizes
  after update of size_width_unit, size_length_unit, size_height_unit on public.settings
  for each row execute function public.settings_relabel_sizes();

-- ---------------------------------------------------------------
-- 3. Branding for the sign-in page (no sign-in needed)
-- ---------------------------------------------------------------
create or replace function public.app_branding()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'company_name', company_name,
    'short_name', short_name,
    'tagline', tagline,
    'logo_url', logo_url)
  from public.settings where id = 1
$$;

revoke all on function public.app_branding() from public;
grant execute on function public.app_branding() to anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- 4. Neutral starting details for new databases
-- ---------------------------------------------------------------
alter table public.settings
  alter column company_name set default 'Your Company Name',
  alter column short_name   set default 'Your Company',
  alter column tagline      set default '',
  alter column address      set default '';

-- 0006 created the settings row with the first client's details. On a
-- brand-new database (no items, no stock, no sales yet) replace them with
-- the neutral ones. A database already in use is left exactly as it is.
update public.settings
set company_name = 'Your Company Name', short_name = 'Your Company', tagline = '', address = ''
where id = 1
  and company_name = 'Ahmed Munir Packaging Industry'
  and not exists (select 1 from public.items)
  and not exists (select 1 from public.stock_movements)
  and not exists (select 1 from public.sales);
