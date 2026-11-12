# Industry templates

A template is the starting set of lists and item-field names for one kind
of factory: `supabase/templates/<name>.sql`. `scripts/new-client.mjs` puts
it into a new client's `setup.sql` after the migrations, behind
`_reset.sql`, which refuses to run on a database with items or documents
and clears migration 0006's starter lists. After setup the owner changes
everything in Settings; a template is only where they start.

| Template | For | Size | Thickness / grade | Colour / type | Pack count | Starter raw materials |
|---|---|---|---|---|---|---|
| `packaging-tape` | BOPP tape, stretch film, strapping | Width (mm) x Length (yd) | Micron | Color / type: Clear, Brown, Printed... | Rolls per carton | Jumbo Roll, Paper Tube, Carton Box, Shrink Film |
| `corrugated-carton` | cartons, boxes, corrugated sheet | Box size: Length x Width x Height (in) | Paper weight (gsm) | Ply / type: 3, 5, 7 Ply, White Top... | Pieces per bundle | Kraft Paper Reel, Fluting Medium, Corn Starch, Stitching Wire |
| `plastic-bags` | poly bags, shopping bags, film | Width x Length (in) | Thickness (micron) | Colour: Natural, White, Black... | Pieces per packet | LDPE and HDPE Granules, White Masterbatch |
| `general` | any other factory | off | off | Type / variety | off | none (categories Raw Material, Packing Material, Finished Goods) |

Each template also sets categories, units and a starting size and
thickness list. Read the file for the exact rows.

## The item fields

Stored on the settings row (migration 0010), edited in **Settings > Item
fields**, read through `app/_lib/item-fields.js`:

| Setting | What it does |
|---|---|
| `size_enabled`, `size_label` | Items have a size, and what it is called |
| `size_width_*`, `size_length_*` | The two measures and their units; size names are built from them ("12in x 10in") |
| `size_height_enabled`, `size_height_*` | A third measure, for boxes |
| `micron_enabled`, `micron_label`, `micron_unit` | One number from a list: micron, gsm, gauge, grade |
| `color_enabled`, `color_label` | One name from a list: colour, type, ply, grade |
| `pack_enabled`, `pack_label`, `pack_unit` | A count per unit of sale, products only |

The database column names stay as they were (`width_mm`, `length_yd`,
`microns`, `rolls_per_carton`) whatever the screens call them; only the
words and units change. Switching a field off hides it on forms, lists and
Settings tabs; values already saved stay on the items.

## Adding a template

1. Copy `general.sql` to `supabase/templates/<new-name>.sql` (lowercase,
   hyphens). Set `industry_template` to the same name.
2. Fill in the settings update (every item-field column), then the
   categories, units, sizes, thickness values, colours/types and a few
   starter raw materials. Plain inserts: `_reset.sql` has already emptied
   the lists. Update settings **before** inserting sizes, so the size names
   use the new units.
3. Run `bash supabase/tests/templates.sh`. It finds the new file by itself,
   builds a setup for a sample client on it, applies it to a throwaway
   database and prints the sizes and categories.
4. Add a row to the table above and to the template table in
   `docs/product/CLIENT_INTAKE.md`.
5. No em dashes or en dashes in the file (the project check covers `supabase/`).
