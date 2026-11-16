// The pages every check walks, in the demo with sample data loaded. Keep in
// step with the app. {item}, {sale} and the like are real records, found
// from the list pages by resolvePages() before the checks run (record ids
// come from the database, so they cannot be written here).
export const PAGES = [
  "/admin",
  "/admin/guide",
  "/admin/guide?lang=ur",
  "/admin/stock",
  "/admin/stock/{item}",
  "/admin/stock/adjust",
  "/admin/raw-materials",
  "/admin/raw-materials/new",
  "/admin/products",
  "/admin/production",
  "/admin/production/new",
  "/admin/production/{run}",
  "/admin/purchases",
  "/admin/purchases/new",
  "/admin/purchases/{purchase}",
  "/admin/sales",
  "/admin/sales/new",
  "/admin/sales/{sale}",
  "/admin/customers",
  "/admin/customers/new",
  "/admin/customers/{customer}",
  "/admin/suppliers",
  "/admin/suppliers/{supplier}",
  "/admin/activity",
  "/admin/users",
  "/admin/settings",
  "/admin/settings?tab=fields",
  "/admin/settings?tab=categories",
  "/admin/settings?tab=brands",
  "/admin/settings?tab=sizes",
  "/admin/settings?tab=microns",
  "/admin/settings?tab=colors",
  "/admin/settings?tab=units",
  "/admin/settings?tab=recipes",
  "/admin/users/{user}",
  "/admin/customers/{customer}/edit",
  "/admin/suppliers/{supplier}/edit",
  "/admin/reports?tab=sales",
  "/admin/reports?tab=purchases",
  "/admin/reports?tab=production",
  "/admin/reports?tab=materials",
  "/admin/reports?tab=stock",
  "/admin/reports?tab=balances",
  "/admin/reports?tab=profit",
  "/login",
];

/** A browser context in a given theme ("light" or "dark"), as the header toggle saves it. */
export async function themedContext(browser, theme, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  await context.addInitScript((t) => {
    try {
      localStorage.setItem("am_theme", t);
    } catch {}
  }, theme);
  return context;
}

/** Load a page and let it hydrate (charts measure themselves after load). */
export async function open(page, base, path) {
  await page.goto(`${base}${path}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // A streamed page shows its loading screen first; wait until it is replaced.
  await page.waitForFunction(() => !document.querySelector('main [aria-busy="true"]'), null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
}

/**
 * Visit every path in one browser context, four at a time, and collect what
 * fn(page, path) returns (an array of problem strings).
 */
export async function eachPage(context, base, paths, fn, concurrency = 4) {
  const queue = [...paths];
  const found = [];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      const page = await context.newPage();
      for (let path = queue.shift(); path; path = queue.shift()) {
        await open(page, base, path);
        for (const f of (await fn(page, path)) ?? []) found.push(`${path}: ${f}`);
      }
      await page.close();
    }),
  );
  return found;
}

// Where each placeholder's record is found: the first matching link on a list page.
const RECORDS = {
  item: ["/admin/stock", /^\/admin\/stock\/[0-9a-f-]{36}$/],
  run: ["/admin/production?status=over", /^\/admin\/production\/[0-9a-f-]{36}$/],
  purchase: ["/admin/purchases", /^\/admin\/purchases\/[0-9a-f-]{36}$/],
  sale: ["/admin/sales", /^\/admin\/sales\/[0-9a-f-]{36}$/],
  customer: ["/admin/customers", /^\/admin\/customers\/[0-9a-f-]{36}$/],
  supplier: ["/admin/suppliers", /^\/admin\/suppliers\/[0-9a-f-]{36}$/],
  user: ["/admin/users", /^\/admin\/users\/[0-9a-f-]{36}$/],
};
export const RECORD = {};

/** Fills in the {placeholders} in PAGES (in place) and RECORD. */
export async function resolvePages(base, browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [key, [list, pattern]] of Object.entries(RECORDS)) {
    await open(page, base, list);
    const hrefs = await page.locator("main a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    const href = hrefs.find((h) => pattern.test(h));
    if (!href) throw new Error(`No ${key} record found on ${list}. Is the sample data loaded?`);
    RECORD[key] = href.split("/").pop();
  }
  await page.close();
  for (let i = 0; i < PAGES.length; i++) PAGES[i] = PAGES[i].replace(/\{(\w+)\}/g, (_, k) => RECORD[k]);
}
