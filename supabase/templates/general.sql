-- Template: any small factory (soap, paint, chemicals, food, garments,
-- moulding...). Plain lists with no size, thickness or pack count; the
-- owner switches those on in Settings > Item fields if the factory needs
-- them, and adds its own categories.

update public.settings set
  industry_template = 'general',
  size_enabled = false, size_label = 'Size',
  size_width_label = 'Width', size_width_unit = 'in',
  size_length_label = 'Length', size_length_unit = 'in',
  size_height_enabled = false, size_height_label = 'Height', size_height_unit = 'in',
  micron_enabled = false, micron_label = 'Grade', micron_unit = '',
  color_enabled = true, color_label = 'Type / variety',
  pack_enabled = false, pack_label = 'Pieces per carton', pack_unit = 'pcs/ctn'
where id = 1;

insert into public.item_categories (name, kind, sort_order) values
  ('Raw Material',     'raw',      1),
  ('Packing Material', 'raw',      2),
  ('Finished Goods',   'finished', 1);

insert into public.units (name, short_name) values
  ('Pieces', 'pcs'), ('Kilogram', 'kg'), ('Liter', 'ltr'), ('Meter', 'm'),
  ('Carton', 'ctn'), ('Bag', 'bag'), ('Dozen', 'dzn'), ('Drum', 'drum');
