-- Template: poly bags, shopping bags and plastic film.
-- Granules and masterbatch blown into film and cut into bags, sold by the
-- kilogram or the packet. Sizes are width x length in inches.

update public.settings set
  industry_template = 'plastic-bags',
  size_enabled = true, size_label = 'Size',
  size_width_label = 'Width', size_width_unit = 'in',
  size_length_label = 'Length', size_length_unit = 'in',
  size_height_enabled = false, size_height_label = 'Gusset', size_height_unit = 'in',
  micron_enabled = true, micron_label = 'Thickness', micron_unit = 'micron',
  color_enabled = true, color_label = 'Colour',
  pack_enabled = true, pack_label = 'Pieces per packet', pack_unit = 'pcs/pkt'
where id = 1;

insert into public.item_categories (name, kind, sort_order) values
  ('LDPE Granules',    'raw',      1),
  ('HDPE Granules',    'raw',      2),
  ('LLDPE Granules',   'raw',      3),
  ('Masterbatch',      'raw',      4),
  ('Printing Ink',     'raw',      5),
  ('Packing Material', 'raw',      6),
  ('Poly Bag',         'finished', 1),
  ('Shopping Bag',     'finished', 2),
  ('Garbage Bag',      'finished', 3),
  ('Plastic Film',     'finished', 4);

insert into public.units (name, short_name) values
  ('Kilogram', 'kg'), ('Pieces', 'pcs'), ('Packet', 'pkt'),
  ('Bundle', 'bdl'), ('Roll', 'roll'), ('Bag (25 kg)', 'bag');

insert into public.sizes (width_mm, length_yd) values
  (8, 12), (10, 14), (12, 16), (14, 18), (16, 20), (20, 30);

insert into public.microns (value) values (15), (20), (25), (30), (40), (50), (60);

insert into public.colors (name) values
  ('Natural'), ('White'), ('Black'), ('Blue'), ('Printed');

insert into public.items (kind, category_id, name, code, unit_id)
select 'raw', c.id, v.name, v.code, u.id
from (values
  ('LDPE Granules',      'GR-LDPE', 'LDPE Granules',  'Kilogram'),
  ('HDPE Granules',      'GR-HDPE', 'HDPE Granules',  'Kilogram'),
  ('White Masterbatch',  'MB-WHT',  'Masterbatch',    'Kilogram')
) as v (name, code, category, unit)
join public.item_categories c on c.name = v.category
join public.units u on u.name = v.unit;
