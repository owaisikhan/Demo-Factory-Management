-- Template: corrugated cartons and boxes.
-- Paper reels by gsm, made into 3, 5 or 7 ply boxes sold in bundles.
-- Sizes are length x width x height in inches.

update public.settings set
  industry_template = 'corrugated-carton',
  size_enabled = true, size_label = 'Box size',
  size_width_label = 'Length', size_width_unit = 'in',
  size_length_label = 'Width', size_length_unit = 'in',
  size_height_enabled = true, size_height_label = 'Height', size_height_unit = 'in',
  micron_enabled = true, micron_label = 'Paper weight', micron_unit = 'gsm',
  color_enabled = true, color_label = 'Ply / type',
  pack_enabled = true, pack_label = 'Pieces per bundle', pack_unit = 'pcs/bdl'
where id = 1;

insert into public.item_categories (name, kind, sort_order) values
  ('Kraft Paper Reel', 'raw',      1),
  ('Fluting Medium',   'raw',      2),
  ('Starch and Glue',  'raw',      3),
  ('Stitching Wire',   'raw',      4),
  ('Printing Ink',     'raw',      5),
  ('Carton Box',       'finished', 1),
  ('Die-cut Box',      'finished', 2),
  ('Corrugated Sheet', 'finished', 3);

insert into public.units (name, short_name) values
  ('Pieces', 'pcs'), ('Kilogram', 'kg'), ('Reel', 'reel'),
  ('Sheet', 'sht'), ('Bundle', 'bdl'), ('Liter', 'ltr');

insert into public.sizes (width_mm, length_yd, height_mm) values
  (12, 10, 8), (14, 10, 10), (16, 12, 10), (18, 12, 12), (20, 14, 12), (24, 18, 18);

insert into public.microns (value) values (112), (120), (125), (140), (150), (175), (200);

insert into public.colors (name) values
  ('3 Ply'), ('5 Ply'), ('7 Ply'), ('Brown'), ('White Top'), ('Printed');

insert into public.items (kind, category_id, name, code, unit_id)
select 'raw', c.id, v.name, v.code, u.id
from (values
  ('Kraft Paper Reel',  'KP-REEL', 'Kraft Paper Reel', 'Kilogram'),
  ('Fluting Medium',    'FM-REEL', 'Fluting Medium',   'Kilogram'),
  ('Corn Starch',       'ST-CORN', 'Starch and Glue',  'Kilogram'),
  ('Stitching Wire',    'SW-WIRE', 'Stitching Wire',   'Kilogram')
) as v (name, code, category, unit)
join public.item_categories c on c.name = v.category
join public.units u on u.name = v.unit;
