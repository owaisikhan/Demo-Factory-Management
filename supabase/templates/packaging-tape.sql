-- Template: packaging tape, stretch film and strapping.
-- BOPP tape slit from jumbo rolls, packed in cartons. The lists the app was
-- first built with (AM Packaging, Faisalabad). Everything stays editable in
-- Settings.

update public.settings set
  industry_template = 'packaging-tape',
  size_enabled = true, size_label = 'Size',
  size_width_label = 'Width', size_width_unit = 'mm',
  size_length_label = 'Length', size_length_unit = 'yd',
  size_height_enabled = false, size_height_label = 'Height', size_height_unit = 'mm',
  micron_enabled = true, micron_label = 'Micron', micron_unit = 'micron',
  color_enabled = true, color_label = 'Color / type',
  pack_enabled = true, pack_label = 'Rolls per carton', pack_unit = 'rolls/ctn'
where id = 1;

insert into public.item_categories (name, kind, sort_order) values
  ('Jumbo Roll',    'raw',      1),
  ('Paper Tube',    'raw',      2),
  ('Carton Box',    'raw',      3),
  ('Shrink Film',   'raw',      4),
  ('Tape Carton',   'finished', 1),
  ('Stretch Film',  'finished', 2),
  ('Plastic Strip', 'finished', 3);

insert into public.units (name, short_name) values
  ('Pieces', 'pcs'), ('Kilogram', 'kg'), ('Roll', 'roll'),
  ('Carton', 'ctn'), ('Meter', 'm'), ('Bundle', 'bdl');

insert into public.sizes (width_mm, length_yd) values
  (24, 72), (36, 72), (46, 72), (46, 70), (48, 72), (60, 72), (69, 72), (72, 72);

insert into public.microns (value) values (38), (40), (42), (45), (48), (50);

insert into public.colors (name) values
  ('Clear'), ('Brown'), ('Printed'), ('Colored'), ('Kraft');

-- One raw material per type; rates and low-stock levels stay at 0
insert into public.items (kind, category_id, name, code, unit_id)
select 'raw', c.id, v.name, v.code, u.id
from (values
  ('Jumbo Roll (BOPP)', 'JR-BOPP', 'Jumbo Roll',  'Kilogram'),
  ('Paper Tube (core)', 'PT-CORE', 'Paper Tube',  'Pieces'),
  ('Carton Box',        'CB-BOX',  'Carton Box',  'Pieces'),
  ('Shrink Film',       'SF-FILM', 'Shrink Film', 'Kilogram')
) as v (name, code, category, unit)
join public.item_categories c on c.name = v.category
join public.units u on u.name = v.unit;
