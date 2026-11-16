import "server-only";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "./supabase-server";
import { siteConfig } from "./siteConfig";
import { itemFields } from "./item-fields";

// Every read query lives in this file. Server-only.
// In local mode (the browser-saved demo, config.js) createClient() answers
// from the visitor's own database instead of Supabase (local-db/), so these
// queries are the same in both.

export const PAGE_SIZE = 20;

function unwrap({ data, error }, what) {
  if (error) throw new Error(`Could not load ${what}: ${error.message}`);
  return data;
}

function pageRange(page, perPage = PAGE_SIZE) {
  const p = Math.max(1, Number(page) || 1);
  const from = (p - 1) * perPage;
  return { page: p, from, to: from + perPage - 1 };
}


// ---------------------------------------------------------------
// Settings and lookup tables
// ---------------------------------------------------------------
export const getSettings = cache(async function getSettings() {
  const supabase = await createClient();
  return unwrap(await supabase.from("settings").select("*").eq("id", 1).maybeSingle(), "the company settings");
});

// The item details this client uses and their names (Settings > Item fields)
export async function getItemFields() {
  return itemFields(await getSettings());
}

// The client's name for the sign-in page, the menu and the page titles.
// Works before sign-in (app_branding is open to anon, migration 0010) and
// never throws: a branding hiccup must not take a page down.
export const getBranding = cache(async function getBranding() {
  const fallback = {
    company_name: siteConfig.fallbackCompanyName,
    short_name: siteConfig.fallbackShortName,
    tagline: "",
    logo_url: "",
  };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("app_branding");
    if (error || !data) return fallback;
    return {
      company_name: data.company_name || fallback.company_name,
      short_name: data.short_name || data.company_name || fallback.short_name,
      tagline: data.tagline || "",
      logo_url: data.logo_url || "",
    };
  } catch (err) {
    unstable_rethrow(err); // let Next see its own "render per request" signal
    return fallback;
  }
});

export async function getLookups() {
  const supabase = await createClient();
  const [categories, units, brands, sizes, microns, colors] = await Promise.all([
    supabase.from("item_categories").select("*").order("kind").order("sort_order").order("name"),
    supabase.from("units").select("*").order("name"),
    supabase.from("brands").select("*").order("name"),
    supabase.from("sizes").select("*").order("width_mm").order("length_yd").order("height_mm", { nullsFirst: true }),
    supabase.from("microns").select("*").order("value"),
    supabase.from("colors").select("*").order("name"),
  ]);
  return {
    categories: unwrap(categories, "the categories"),
    units: unwrap(units, "the units"),
    brands: unwrap(brands, "the brands"),
    sizes: unwrap(sizes, "the sizes"),
    microns: unwrap(microns, "the microns"),
    colors: unwrap(colors, "the colors"),
  };
}

// ---------------------------------------------------------------
// Items and stock
// ---------------------------------------------------------------

/**
 * One page of items with their stock, filtered.
 * filters: { kind, category, status, q, page }
 */
export async function getStockPage(filters = {}) {
  const { kind, category, status, q, page, active = "active" } = filters;


  const supabase = await createClient();
  const { from, to } = pageRange(page);
  let query = supabase.from("item_stock").select("*", { count: "exact" });
  if (kind) query = query.eq("kind", kind);
  if (category) query = query.eq("category_id", category);
  if (status) query = query.eq("stock_status", status);
  if (active === "active") query = query.eq("active", true);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ").trim();
    if (safe) query = query.or(`name.ilike.%${safe}%,code.ilike.%${safe}%,brand_name.ilike.%${safe}%`);
  }
  const { data, error, count } = await query
    .order("kind")
    .order("category_name")
    .order("name")
    .range(from, to);
  if (error) throw new Error(`Could not load the stock: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

/** Counts for the four stat cards. Worked out by the database, not by paging rows. */
export async function getStockCounts(kind) {
  const supabase = await createClient();
  const count = async (status) => {
    let query = supabase.from("item_stock").select("id", { count: "exact", head: true }).eq("active", true);
    if (kind) query = query.eq("kind", kind);
    if (status) query = query.eq("stock_status", status);
    const { count: n, error } = await query;
    if (error) throw new Error(`Could not count the stock: ${error.message}`);
    return n ?? 0;
  };
  const [total, inStock, low, out] = await Promise.all([count(), count("in"), count("low"), count("out")]);
  return { total, in: inStock, low, out };
}

export async function getItem(id) {
  const supabase = await createClient();
  return unwrap(await supabase.from("item_stock").select("*").eq("id", id).maybeSingle(), "the item");
}

/** Raw items for pickers (recipes, purchases). Small table, no paging needed. */
export async function getItemOptions(kind) {
  const supabase = await createClient();
  let query = supabase.from("item_stock").select("id, name, code, kind, unit, brand_name, on_hand, default_rate").eq("active", true);
  if (kind) query = query.eq("kind", kind);
  return unwrap(await query.order("name"), "the items");
}

export async function getItemMovements(itemId, page = 1) {
  const supabase = await createClient();
  const { from, to } = pageRange(page);
  const { data, error, count } = await supabase
    .from("stock_movements")
    .select("id, movement_date, qty, type, note, ref_table, ref_id, created_at, profiles(full_name)", { count: "exact" })
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`Could not load the stock history: ${error.message}`);
  return {
    rows: (data ?? []).map((r) => ({ ...r, actor_name: r.profiles?.full_name ?? "System" })),
    total: count ?? 0,
  };
}

export async function getRecipe(itemId) {
  const supabase = await createClient();
  const recipe = unwrap(
    await supabase.from("recipes").select("id, notes, recipe_lines(raw_item_id, qty_per_unit)").eq("item_id", itemId).maybeSingle(),
    "the recipe",
  );
  if (!recipe) return null;
  return { notes: recipe.notes, lines: recipe.recipe_lines ?? [] };
}

// ---------------------------------------------------------------
// Users
// ---------------------------------------------------------------
export async function getProfiles() {
  const supabase = await createClient();
  return unwrap(
    await supabase.from("profiles").select("id, full_name, role, active, permissions, created_at").order("role").order("full_name"),
    "the users",
  );
}

// ---------------------------------------------------------------
// Activity log (admins only; RLS returns nothing to workers)
// ---------------------------------------------------------------

/** filters: { user, module, action, from, to, q, page } */
export async function getActivityPage(filters = {}) {
  const { user, module, action, from: dateFrom, to: dateTo, q, page } = filters;


  const supabase = await createClient();
  const { from, to } = pageRange(page);
  let query = supabase.from("activity_log").select("*", { count: "exact" });
  if (user) query = query.eq("user_id", user);
  if (module) query = query.eq("module", module);
  if (action) query = query.eq("action", action);
  // Dates are the business's local days (Pakistan, UTC+5)
  if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00+05:00`);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59.999+05:00`);
  if (q) query = query.ilike("summary", `%${q.replace(/[%_]/g, " ").trim()}%`);
  const { data, error, count } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to);
  if (error) throw new Error(`Could not load the activity log: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

/** Today's counts for the stat cards, by the database. */
export async function getActivityCounts(user) {
  const supabase = await createClient();
  const start = new Date();
  const todayPk = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(start);
  const count = async (apply) => {
    let query = supabase.from("activity_log").select("id", { count: "exact", head: true });
    if (user) query = query.eq("user_id", user);
    query = apply(query);
    const { count: n, error } = await query;
    if (error) throw new Error(`Could not count the activity: ${error.message}`);
    return n ?? 0;
  };
  const [today, created, updated, deleted] = await Promise.all([
    count((qy) => qy.gte("created_at", `${todayPk}T00:00:00+05:00`)),
    count((qy) => qy.eq("action", "created")),
    count((qy) => qy.in("action", ["updated", "adjusted"])),
    count((qy) => qy.in("action", ["deleted", "voided"])),
  ]);
  return { today, created, updated, deleted };
}

/** Everything matching the filters, for the CSV export (capped, and says so). */
export async function getActivityForExport(filters = {}, limit = 5000) {
  const supabase = await createClient();
  let query = supabase.from("activity_log").select("created_at, actor_name, action, module, record_label, summary");
  if (filters.user) query = query.eq("user_id", filters.user);
  if (filters.module) query = query.eq("module", filters.module);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00+05:00`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999+05:00`);
  if (filters.q) query = query.ilike("summary", `%${filters.q.replace(/[%_]/g, " ").trim()}%`);
  return unwrap(await query.order("created_at", { ascending: false }).limit(limit), "the activity log");
}

/** Low stock count for the header bell. */
export async function getLowStockAlerts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_stock")
    .select("id, name, on_hand, unit, stock_status, kind, low_stock_level")
    .eq("active", true)
    .in("stock_status", ["low", "out"])
    .order("stock_status", { ascending: false })
    .order("name")
    .limit(8);
  if (error) return [];
  return data ?? [];
}

// ---------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------

/** Active suppliers for pick lists. */
export async function getSupplierOptions() {
  const supabase = await createClient();
  return unwrap(await supabase.from("suppliers").select("id, name").eq("active", true).order("name"), "the suppliers");
}

export async function getSupplier(id) {
  const supabase = await createClient();
  return unwrap(await supabase.from("suppliers").select("*").eq("id", id).maybeSingle(), "the supplier");
}

/**
 * One page of suppliers. Admins get balances (supplier_balances); workers get
 * the plain list, because supplier payments are admin-only.
 */
export async function getSuppliersPage({ q, page, owing, isAdmin }) {
  const supabase = await createClient();
  const { from, to } = pageRange(page);
  let query = isAdmin
    ? supabase.from("supplier_balances").select("*", { count: "exact" })
    : supabase.from("suppliers").select("id, name, phone, active, contact_person", { count: "exact" });
  if (q) {
    const safe = q.replace(/[%,()]/g, " ").trim();
    if (safe) query = query.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  if (owing && isAdmin) query = query.gt("balance", 0);
  const { data, error, count } = await query.order("name").range(from, to);
  if (error) throw new Error(`Could not load the suppliers: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function getSupplierTotals() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("supplier_totals");
  if (error) throw new Error(`Could not total the suppliers: ${error.message}`);
  return data?.[0] ?? { suppliers: 0, payable: 0, with_balance: 0 };
}

export async function getSupplierBalance(id) {
  const supabase = await createClient();
  return unwrap(await supabase.from("supplier_balances").select("*").eq("id", id).maybeSingle(), "the supplier balance");
}

/** Running-balance ledger, worked out by supplier_ledger() in Postgres. */
export async function getSupplierLedger(id, { from, to } = {}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("supplier_ledger", {
    p_supplier_id: id,
    p_from: from || null,
    p_to: to || null,
  });
  if (error) throw new Error(`Could not load the ledger: ${error.message}`);
  return data ?? [];
}

/** Every payment to a supplier, void ones included, newest first. */
export async function getSupplierPayments(supplierId) {
  const supabase = await createClient();
  const data = unwrap(
    await supabase
      .from("supplier_payments")
      .select("*, purchases(purchase_no)")
      .eq("supplier_id", supplierId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false }),
    "the payments",
  );
  return data.map((p) => ({ ...p, purchase_no: p.purchases?.purchase_no ?? null }));
}

/** Bills that still have something to pay, for the payment form's pick list. */
export async function getOpenPurchases(supplierId) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("purchase_list")
      .select("id, purchase_no, purchase_date, total, paid, payment_status")
      .eq("supplier_id", supplierId)
      .in("payment_status", ["unpaid", "partly"])
      .order("purchase_date"),
    "the unpaid bills",
  );
}

// ---------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------

/** filters: { supplier, status, from, to, q, page } */
export async function getPurchasesPage(filters = {}) {
  const { supplier, status, from: dateFrom, to: dateTo, q, page } = filters;
  const supabase = await createClient();
  const { from, to } = pageRange(page);
  let query = supabase.from("purchase_list").select("*", { count: "exact" });
  if (supplier) query = query.eq("supplier_id", supplier);
  if (status) query = query.eq("payment_status", status);
  if (dateFrom) query = query.gte("purchase_date", dateFrom);
  if (dateTo) query = query.lte("purchase_date", dateTo);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ").trim();
    if (safe) query = query.or(`purchase_no.ilike.%${safe}%,supplier_ref.ilike.%${safe}%,supplier_name.ilike.%${safe}%`);
  }
  const { data, error, count } = await query
    .order("purchase_date", { ascending: false })
    .order("purchase_no", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`Could not load the purchases: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

/** Card totals over the given dates and supplier, from purchase_totals(). */
export async function getPurchaseTotals({ from, to, supplier } = {}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("purchase_totals", { p_from: from || null, p_to: to || null, p_supplier: supplier || null });
  if (error) throw new Error(`Could not total the purchases: ${error.message}`);
  return data?.[0] ?? { bills: 0, total: 0, paid: 0, unpaid: 0 };
}

/** A purchase with its lines, and its payments when the reader is an admin. */
export async function getPurchase(id, { withPayments = false } = {}) {
  const supabase = await createClient();
  const purchase = unwrap(await supabase.from("purchase_list").select("*").eq("id", id).maybeSingle(), "the purchase");
  if (!purchase) return null;
  const [linesRes, creatorRes, paymentsRes] = await Promise.all([
    supabase.from("purchase_lines").select("id, item_id, qty, rate, amount, items(name, code, brand_id, units(short_name), brands(name))").eq("purchase_id", id),
    purchase.created_by ? supabase.from("profiles").select("full_name").eq("id", purchase.created_by).maybeSingle() : { data: null },
    withPayments
      ? supabase.from("supplier_payments").select("*").eq("purchase_id", id).order("payment_date")
      : { data: [] },
  ]);
  const lines = unwrap(linesRes, "the purchase lines").map((l) => ({
    ...l,
    item_name: l.items?.name ?? "",
    unit: l.items?.units?.short_name ?? "",
    brand_name: l.items?.brands?.name ?? null,
  }));
  return {
    purchase: { ...purchase, created_by_name: creatorRes.data?.full_name ?? "" },
    lines,
    payments: paymentsRes.data ?? [],
  };
}

// ---------------------------------------------------------------
// Production
// ---------------------------------------------------------------

/** filters: { item, status, from, to, q, page } */
export async function getProductionPage(filters = {}) {
  const { item, status, from: dateFrom, to: dateTo, q, page } = filters;
  const supabase = await createClient();
  const { from, to } = pageRange(page);
  let query = supabase.from("production_list").select("*", { count: "exact" });
  if (item) query = query.eq("item_id", item);
  if (status === "over") query = query.eq("status", "posted").gt("over_recipe", 0);
  else if (status) query = query.eq("status", status);
  if (dateFrom) query = query.gte("run_date", dateFrom);
  if (dateTo) query = query.lte("run_date", dateTo);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ").trim();
    if (safe) query = query.or(`run_no.ilike.%${safe}%,item_name.ilike.%${safe}%,item_code.ilike.%${safe}%`);
  }
  const { data, error, count } = await query
    .order("run_date", { ascending: false })
    .order("run_no", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`Could not load the production runs: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

/** { runs, products, made: [{ unit, qty }] } from production_totals(). */
export async function getProductionTotals({ from, to, item } = {}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("production_totals", { p_from: from || null, p_to: to || null, p_item: item || null });
  if (error) throw new Error(`Could not total the production: ${error.message}`);
  return data ?? { runs: 0, products: 0, made: [] };
}

/** A run with the materials it used: expected (recipe) and actual. */
export async function getProductionRun(id) {
  const supabase = await createClient();
  const run = unwrap(await supabase.from("production_list").select("*").eq("id", id).maybeSingle(), "the production run");
  if (!run) return null;
  const rows = unwrap(
    await supabase
      .from("production_consumption")
      .select("id, raw_item_id, qty, expected_qty, items(name, units(short_name))")
      .eq("run_id", id),
    "the materials used",
  );
  return {
    run,
    materials: rows.map((m) => ({ ...m, item_name: m.items?.name ?? "", unit: m.items?.units?.short_name ?? "" })),
  };
}

/** Every product's recipe in one go: { [item_id]: { notes, lines } }. */
export async function getRecipesForProducts() {
  const supabase = await createClient();
  const data = unwrap(await supabase.from("recipes").select("item_id, notes, recipe_lines(raw_item_id, qty_per_unit)"), "the recipes");
  return Object.fromEntries(data.map((r) => [r.item_id, { notes: r.notes, lines: r.recipe_lines ?? [] }]));
}

// ---------------------------------------------------------------
// Customers
// ---------------------------------------------------------------
export async function getCustomerOptions() {
  const supabase = await createClient();
  return unwrap(await supabase.from("customers").select("id, name").eq("active", true).order("name"), "the customers");
}

export async function getCustomer(id) {
  const supabase = await createClient();
  return unwrap(await supabase.from("customers").select("*").eq("id", id).maybeSingle(), "the customer");
}

/** Admins get balances (customer_balances); workers get the plain list. */
export async function getCustomersPage({ q, page, owing, isAdmin }) {
  const supabase = await createClient();
  const { from, to } = pageRange(page);
  let query = isAdmin
    ? supabase.from("customer_balances").select("*", { count: "exact" })
    : supabase.from("customers").select("id, name, phone, active, contact_person", { count: "exact" });
  if (q) {
    const safe = q.replace(/[%,()]/g, " ").trim();
    if (safe) query = query.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  if (owing && isAdmin) query = query.gt("balance", 0);
  const { data, error, count } = await query.order("name").range(from, to);
  if (error) throw new Error(`Could not load the customers: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function getCustomerTotals() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("customer_totals");
  if (error) throw new Error(`Could not total the customers: ${error.message}`);
  return data?.[0] ?? { customers: 0, receivable: 0, owing: 0 };
}

export async function getCustomerBalance(id) {
  const supabase = await createClient();
  return unwrap(await supabase.from("customer_balances").select("*").eq("id", id).maybeSingle(), "the customer balance");
}

/** Running-balance ledger, worked out by customer_ledger() in Postgres. */
export async function getCustomerLedger(id, { from, to } = {}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("customer_ledger", { p_customer_id: id, p_from: from || null, p_to: to || null });
  if (error) throw new Error(`Could not load the ledger: ${error.message}`);
  return data ?? [];
}

export async function getCustomerPayments(customerId) {
  const supabase = await createClient();
  const data = unwrap(
    await supabase
      .from("customer_payments")
      .select("*, sales(invoice_no)")
      .eq("customer_id", customerId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false }),
    "the payments",
  );
  return data.map((p) => ({ ...p, invoice_no: p.sales?.invoice_no ?? null }));
}

/** Invoices with something left to receive, for the payment form. */
export async function getOpenSales(customerId) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("sale_list")
      .select("id, invoice_no, sale_date, total, paid, payment_status")
      .eq("customer_id", customerId)
      .in("payment_status", ["unpaid", "partly"])
      .order("sale_date"),
    "the open invoices",
  );
}

// ---------------------------------------------------------------
// Sales
// ---------------------------------------------------------------

/** filters: { customer, status, from, to, q, page }. status may be "overdue". */
export async function getSalesPage(filters = {}) {
  const { customer, status, from: dateFrom, to: dateTo, q, page } = filters;
  const supabase = await createClient();
  const { from, to } = pageRange(page);
  let query = supabase.from("sale_list").select("*", { count: "exact" });
  if (customer) query = query.eq("customer_id", customer);
  if (status === "overdue") query = query.eq("overdue", true);
  else if (status) query = query.eq("payment_status", status);
  if (dateFrom) query = query.gte("sale_date", dateFrom);
  if (dateTo) query = query.lte("sale_date", dateTo);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ").trim();
    if (safe) query = query.or(`invoice_no.ilike.%${safe}%,customer_name.ilike.%${safe}%`);
  }
  const { data, error, count } = await query
    .order("sale_date", { ascending: false })
    .order("invoice_no", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`Could not load the invoices: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function getSaleTotals({ from, to, customer } = {}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sale_totals", { p_from: from || null, p_to: to || null, p_customer: customer || null });
  if (error) throw new Error(`Could not total the sales: ${error.message}`);
  return data?.[0] ?? { invoices: 0, total: 0, paid: 0, unpaid: 0 };
}

/** An invoice with its lines and customer; payments only for admins. */
export async function getSale(id, { withPayments = false } = {}) {
  const supabase = await createClient();
  const sale = unwrap(await supabase.from("sale_list").select("*").eq("id", id).maybeSingle(), "the invoice");
  if (!sale) return null;
  const [customerRes, linesRes, creatorRes, paymentsRes] = await Promise.all([
    supabase.from("customers").select("*").eq("id", sale.customer_id).maybeSingle(),
    supabase.from("sale_lines").select("id, item_id, qty, rate, amount, items(name, code, units(short_name))").eq("sale_id", id),
    sale.created_by ? supabase.from("profiles").select("full_name").eq("id", sale.created_by).maybeSingle() : { data: null },
    withPayments ? supabase.from("customer_payments").select("*").eq("sale_id", id).order("payment_date") : { data: [] },
  ]);
  return {
    sale: { ...sale, created_by_name: creatorRes.data?.full_name ?? "" },
    customer: unwrap(customerRes, "the customer"),
    lines: unwrap(linesRes, "the invoice lines").map((l) => ({
      ...l,
      item_name: l.items?.name ?? "",
      item_code: l.items?.code ?? "",
      unit: l.items?.units?.short_name ?? "",
    })),
    payments: paymentsRes.data ?? [],
  };
}

// ---------------------------------------------------------------
// Reports and dashboard charts (0007_reports.sql). Money reports are
// admin-only in the database; production figures are for all staff.
// Ranges are ISO dates; grain is "day", "week" or "month".
// ---------------------------------------------------------------

/** Postgres numerics can arrive as strings; charts need numbers. */
function numeric(rows, keys) {
  return (rows ?? []).map((r) => {
    const out = { ...r };
    for (const k of keys) if (out[k] !== null && out[k] !== undefined) out[k] = Number(out[k]);
    return out;
  });
}

async function rpcRows(fn, args, what, keys) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(`Could not load ${what}: ${error.message}`);
  return numeric(data, keys);
}

export async function getTradeSeries({ from, to, grain = "day" }) {
  return rpcRows("report_trade_series", { p_from: from, p_to: to, p_grain: grain }, "sales and purchases", ["sales", "purchases"]);
}

export async function getTopCustomers({ from, to, limit = 10 }) {
  return rpcRows("report_top_customers", { p_from: from, p_to: to, p_limit: limit }, "the top customers", ["total"]);
}

export async function getTopSuppliers({ from, to, limit = 10 }) {
  return rpcRows("report_top_suppliers", { p_from: from, p_to: to, p_limit: limit }, "the top suppliers", ["total"]);
}

export async function getTopProducts({ from, to, limit = 5 }) {
  return rpcRows("report_top_products", { p_from: from, p_to: to, p_limit: limit }, "the best-selling products", ["qty", "amount"]);
}

export async function getProductionSeries({ from, to, grain = "day" }) {
  return rpcRows("report_production_series", { p_from: from, p_to: to, p_grain: grain }, "production figures", ["qty"]);
}

export async function getProductionByProduct({ from, to }) {
  return rpcRows("report_production_by_product", { p_from: from, p_to: to }, "production per product", ["qty"]);
}

export async function getMaterialUse({ from, to, grain = "day" }) {
  return rpcRows("report_material_use", { p_from: from, p_to: to, p_grain: grain }, "material use", ["used", "expected"]);
}

export async function getMaterialSummary({ from, to }) {
  return rpcRows("report_material_summary", { p_from: from, p_to: to }, "material use", ["used", "expected", "difference", "difference_pct"]);
}

export async function getStockValue() {
  return rpcRows("report_stock_value", {}, "the stock value", ["value"]);
}

export async function getStockFlow({ from, to, grain = "month" }) {
  return rpcRows("report_stock_flow", { p_from: from, p_to: to, p_grain: grain }, "stock in and out", ["value_in", "value_out"]);
}

export async function getAgeing(asOf) {
  return rpcRows("report_ageing", { p_as_of: asOf }, "the ageing of balances", ["amount"]);
}

export async function getProfit({ from, to, grain = "month" }) {
  return rpcRows("report_profit", { p_from: from, p_to: to, p_grain: grain }, "the profit report", ["revenue", "cost", "gross_profit"]);
}

/** Balances for the Receivables & Payables report (largest first). */
export async function getPartyBalances(side, limit = 10) {
  const supabase = await createClient();
  const view = side === "customer" ? "customer_balances" : "supplier_balances";
  const data = unwrap(await supabase.from(view).select("id, name, balance").gt("balance", 0).order("balance", { ascending: false }).limit(limit), "the balances");
  return numeric(data, ["balance"]);
}
