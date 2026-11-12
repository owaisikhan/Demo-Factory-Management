// Which extra details an item has, and what each is called, for this
// client. Comes from the settings row (Settings > Item fields, migration
// 0010); an industry template sets them at setup. The defaults are the
// packaging-tape words the app started with. Safe on server and client.

const DEFAULTS = {
  size_enabled: true,
  size_label: "Size",
  size_width_label: "Width",
  size_width_unit: "mm",
  size_length_label: "Length",
  size_length_unit: "yd",
  size_height_enabled: false,
  size_height_label: "Height",
  size_height_unit: "mm",
  micron_enabled: true,
  micron_label: "Micron",
  micron_unit: "micron",
  color_enabled: true,
  color_label: "Color / type",
  pack_enabled: true,
  pack_label: "Rolls per carton",
  pack_unit: "rolls/ctn",
};

export const ITEM_FIELD_KEYS = Object.keys(DEFAULTS);

function pick(settings, key) {
  const v = settings?.[key];
  if (v === undefined || v === null) return DEFAULTS[key];
  // An empty name falls back; an empty unit is allowed ("Grade 3", no unit)
  if (typeof DEFAULTS[key] === "string" && !key.endsWith("_unit") && String(v).trim() === "") return DEFAULTS[key];
  return v;
}

export function itemFields(settings) {
  const s = (key) => pick(settings, key);
  return {
    size: {
      enabled: s("size_enabled"),
      label: s("size_label"),
      width: { label: s("size_width_label"), unit: s("size_width_unit") },
      length: { label: s("size_length_label"), unit: s("size_length_unit") },
      height: { enabled: s("size_height_enabled"), label: s("size_height_label"), unit: s("size_height_unit") },
    },
    micron: { enabled: s("micron_enabled"), label: s("micron_label"), unit: s("micron_unit") },
    color: { enabled: s("color_enabled"), label: s("color_label") },
    pack: { enabled: s("pack_enabled"), label: s("pack_label"), unit: s("pack_unit") },
  };
}

function num(v) {
  return Number(v).toLocaleString("en-PK", { maximumFractionDigits: 3 });
}

// "40 micron", "120 gsm", "2.5 gauge"
export function formatThickness(value, fields) {
  if (value === null || value === undefined || value === "") return "";
  return `${num(value)} ${fields.micron.unit}`.trim();
}

// "72 rolls/ctn", "500 pcs/bundle"
export function formatPack(value, fields) {
  if (!value) return "";
  return `${num(value)} ${fields.pack.unit}`.trim();
}

// The short details line under an item's name, in the client's own words.
export function itemDetails(row, fields) {
  return [
    row.brand_name,
    fields.size.enabled ? row.size_label : null,
    fields.micron.enabled ? formatThickness(row.micron_value, fields) : null,
    fields.color.enabled ? row.color_name : null,
    fields.pack.enabled ? formatPack(row.rolls_per_carton, fields) : null,
  ].filter(Boolean);
}
