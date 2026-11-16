import "server-only";
import * as demo from "../demo-data";

// "Fill with sample data": the demo's sample month (demo-data.js, dated so it
// ends today) entered into a real database through the same posting
// functions the app uses, so stock, ledgers, numbers and the activity log are
// exactly what the app itself would have produced. Runs once per server
// start, as the demo admin; the result is a starting point (engine.js).

const SUB = (id) => `select set_config('request.jwt.claim.sub', '${id}', false)`;

async function q(db, sql, params = []) {
  return (await db.query(sql, params)).rows;
}

async function at(db, when, fn) {
  await q(db, "select set_config('local.now', $1, false)", [when]);
  try {
    return await fn();
  } finally {
    await q(db, "select set_config('local.now', '', false)");
  }
}

async function rpc(db, name, args) {
  const keys = Object.keys(args);
  const params = keys.map((k) => (args[k] !== null && typeof args[k] === "object" ? JSON.stringify(args[k]) : args[k]));
  const call = `public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")})`;
  return (await q(db, `select ${call} as v`, params))[0]?.v ?? null;
}

const ts = (date, time = "09:00:00") => `${date}T${time}Z`;

export async function buildSampleData(db) {
  const adminId = (await q(db, "select current_setting('request.jwt.claim.sub') as id"))[0].id;
  const firstDay = [
    ...demo.demoPurchases.map((p) => p.purchase_date),
    ...demo.demoSales.map((s) => s.sale_date),
    ...demo.demoProductionRuns.map((r) => r.run_date),
  ].sort()[0];
  const openingDay = new Date(new Date(`${firstDay}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);
  const setupAt = ts(openingDay, "05:00:00");

  // ---- lists, matched by name to what migration 0006 already has ----
  const ids = {};
  await at(db, setupAt, async () => {
    for (const c of demo.demoCategories) {
      await q(db, "insert into item_categories (name, kind, sort_order) values ($1, $2, $3) on conflict (name) do nothing", [c.name, c.kind, c.sort_order]);
      ids[c.id] = (await q(db, "select id from item_categories where name = $1", [c.name]))[0].id;
    }
    for (const u of demo.demoUnits) {
      await q(db, "insert into units (name, short_name) values ($1, $2) on conflict (name) do nothing", [u.name, u.short_name]);
      ids[u.id] = (await q(db, "select id from units where name = $1", [u.name]))[0].id;
    }
    for (const b of demo.demoBrands) {
      await q(db, "insert into brands (name) values ($1) on conflict (name) do nothing", [b.name]);
      ids[b.id] = (await q(db, "select id from brands where name = $1", [b.name]))[0].id;
    }
    for (const s of demo.demoSizes) {
      const found = await q(db, "select id from sizes where width_mm = $1 and length_yd = $2 and height_mm is null", [s.width_mm, s.length_yd]);
      ids[s.id] = found[0]?.id ?? (await q(db, "insert into sizes (width_mm, length_yd) values ($1, $2) returning id", [s.width_mm, s.length_yd]))[0].id;
    }
    for (const m of demo.demoMicrons) {
      await q(db, "insert into microns (value) values ($1) on conflict (value) do nothing", [m.value]);
      ids[m.id] = (await q(db, "select id from microns where value = $1", [m.value]))[0].id;
    }
    for (const c of demo.demoColors) {
      await q(db, "insert into colors (name) values ($1) on conflict (name) do nothing", [c.name]);
      ids[c.id] = (await q(db, "select id from colors where name = $1", [c.name]))[0].id;
    }

    // ---- items ----
    for (const it of demo.demoItems) {
      const row = (await q(db, `insert into items (kind, category_id, name, code, unit_id, brand_id, size_id, micron_id, color_id,
          rolls_per_carton, low_stock_level, default_rate, active)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) returning id`, [
        it.kind, ids[it.category_id], it.name, it.code, ids[it.unit_id], ids[it.brand_id] ?? null, ids[it.size_id] ?? null,
        ids[it.micron_id] ?? null, ids[it.color_id] ?? null, it.rolls_per_carton ?? null, it.low_stock_level ?? 0, it.default_rate ?? 0, it.active,
      ]))[0];
      ids[it.id] = row.id;
    }

    // ---- recipes ----
    for (const [itemId, r] of Object.entries(demo.demoRecipes)) {
      await rpc(db, "save_recipe", {
        p_item_id: ids[itemId],
        p_lines: r.lines.map((l) => ({ raw_item_id: ids[l.raw_item_id], qty_per_unit: l.qty_per_unit })),
        p_notes: r.notes,
      });
    }

    // ---- customers and suppliers ----
    for (const c of demo.demoCustomers) {
      ids[c.id] = (await q(db, `insert into customers (name, contact_person, phone, address, ntn, opening_balance, notes)
        values ($1, $2, $3, $4, $5, $6, $7) returning id`, [c.name, c.contact_person, c.phone, c.address, c.ntn ?? "", c.opening_balance, c.notes]))[0].id;
    }
    for (const s of demo.demoSuppliers) {
      ids[s.id] = (await q(db, `insert into suppliers (name, contact_person, phone, address, opening_balance, notes)
        values ($1, $2, $3, $4, $5, $6) returning id`, [s.name, s.contact_person, s.phone, s.address, s.opening_balance, s.notes]))[0].id;
    }
  });

  // ---- the staff (sign-in accounts need the database owner) ----
  await db.exec("reset role;");
  for (const p of demo.demoProfiles.filter((x) => x.id !== "demo-admin")) {
    const uid = (await q(db, "insert into auth.users (id, email) values (public.local_uuid(), $1) returning id", [p.email]))[0].id;
    await at(db, setupAt, () => q(db, "insert into profiles (id, full_name, role, active, permissions) values ($1, $2, $3, $4, $5)",
      [uid, p.full_name, p.role, p.active, p.permissions]));
  }
  await db.exec(`set role authenticated; ${SUB(adminId)};`);

  // ---- every document in date order, with its voids and payments ----
  const events = [];
  const lines = (rows, key, id) => rows.filter((l) => l[key] === id).map((l) => ({ item_id: l.item_id, qty: l.qty, rate: l.rate }));
  for (const p of demo.demoPurchases) {
    const pl = lines(demo.demoPurchaseLines, "purchase_id", p.id);
    events.push({ when: p.created_at, order: 0, kind: "purchase", doc: p, lines: pl, flow: pl.map((l) => [l.item_id, +l.qty]) });
    if (p.status === "void") events.push({ when: p.created_at, order: 1, kind: "void_purchase", doc: p, flow: pl.map((l) => [l.item_id, -l.qty]) });
  }
  for (const r of demo.demoProductionRuns) {
    const mats = demo.demoProductionConsumption.filter((c) => c.run_id === r.id);
    const flow = [[r.item_id, +r.qty_made], ...mats.map((m) => [m.raw_item_id, -m.qty])];
    events.push({ when: r.created_at, order: 0, kind: "run", doc: r, mats, flow });
    if (r.status === "void") events.push({ when: r.created_at, order: 1, kind: "void_run", doc: r, flow: flow.map(([i, n]) => [i, -n]) });
  }
  for (const s of demo.demoSales) {
    const sl = lines(demo.demoSaleLines, "sale_id", s.id);
    events.push({ when: s.created_at, order: 0, kind: "sale", doc: s, lines: sl, flow: sl.map((l) => [l.item_id, -l.qty]) });
    if (s.status === "void") events.push({ when: s.created_at, order: 1, kind: "void_sale", doc: s, flow: sl.map((l) => [l.item_id, +l.qty]) });
  }
  for (const p of demo.demoSupplierPayments) events.push({ when: p.created_at, order: 2, kind: "supplier_payment", doc: p, flow: [] });
  for (const p of demo.demoCustomerPayments) events.push({ when: p.created_at, order: 2, kind: "customer_payment", doc: p, flow: [] });
  events.sort((a, b) => a.when.localeCompare(b.when) || a.order - b.order);

  // Opening stock: enough that nothing ever goes below zero on the way,
  // and the closing figure matches the sample's on-hand count where it can.
  const net = {}, low = {};
  for (const e of events) {
    for (const [item, n] of e.flow) {
      net[item] = (net[item] ?? 0) + n;
      low[item] = Math.min(low[item] ?? 0, net[item]);
    }
  }
  await at(db, setupAt, async () => {
    for (const it of demo.demoItems) {
      const need = Math.max(-(low[it.id] ?? 0), it.on_hand - (net[it.id] ?? 0), 0);
      if (need > 0) await rpc(db, "adjust_stock", { p_item_id: ids[it.id], p_qty: need, p_type: "opening", p_note: "Counted on day one", p_date: openingDay });
    }
  });

  const docIds = {};
  for (const e of events) {
    try {
      await at(db, e.when, async () => {
        const d = e.doc;
        if (e.kind === "purchase") {
          docIds[d.id] = await rpc(db, "post_purchase", { p: {
            supplier_id: ids[d.supplier_id], purchase_date: d.purchase_date, supplier_ref: d.supplier_ref,
            discount: d.discount, gst_rate: d.gst_rate, other_charges: d.other_charges, notes: d.notes ?? "",
            lines: e.lines.map((l) => ({ ...l, item_id: ids[l.item_id] })) } });
        } else if (e.kind === "void_purchase") {
          await rpc(db, "void_purchase", { p_id: docIds[d.id], p_reason: d.void_reason });
        } else if (e.kind === "run") {
          docIds[d.id] = await rpc(db, "post_production", { p: {
            item_id: ids[d.item_id], qty_made: d.qty_made, run_date: d.run_date, notes: d.notes ?? "",
            materials: e.mats.map((m) => ({ item_id: ids[m.raw_item_id], qty: m.qty })) } });
        } else if (e.kind === "void_run") {
          await rpc(db, "void_production", { p_id: docIds[d.id], p_reason: d.void_reason });
        } else if (e.kind === "sale") {
          docIds[d.id] = await rpc(db, "post_sale", { p: {
            customer_id: ids[d.customer_id], sale_date: d.sale_date, due_date: d.due_date, discount: d.discount,
            gst_rate: d.gst_rate, other_charges: d.other_charges, notes: d.notes ?? "",
            lines: e.lines.map((l) => ({ ...l, item_id: ids[l.item_id] })) } });
        } else if (e.kind === "void_sale") {
          await rpc(db, "void_sale", { p_id: docIds[d.id], p_reason: d.void_reason });
        } else if (e.kind === "supplier_payment") {
          const id = await rpc(db, "record_supplier_payment", { p: {
            supplier_id: ids[d.supplier_id], purchase_id: docIds[d.purchase_id] ?? null, payment_date: d.payment_date,
            amount: d.amount, method: d.method, reference: d.reference, note: d.note } });
          if (d.status === "void") await rpc(db, "void_supplier_payment", { p_id: id, p_reason: d.void_reason });
        } else if (e.kind === "customer_payment") {
          const id = await rpc(db, "record_customer_payment", { p: {
            customer_id: ids[d.customer_id], sale_id: docIds[d.sale_id] ?? null, payment_date: d.payment_date,
            amount: d.amount, method: d.method, reference: d.reference, note: d.note } });
          if (d.status === "void") await rpc(db, "void_customer_payment", { p_id: id, p_reason: d.void_reason });
        }
      });
    } catch (err) {
      console.warn(`Sample data: skipped ${e.kind} ${e.doc.id}: ${err.message}`);
    }
  }
}
