// The product shows each client's own name and words, never the first
// client's. Names come from the settings row (demo: demoSettings), so a
// hard-coded "AM Packaging" or a tape word in a label is a product bug: the
// next client would see someone else's factory.
import { PAGES, eachPage, open } from "./pages.mjs";
// Same values as demoSettings in app/_lib/demo-data.js
const demoSettings = {
  short_name: "Demo Packaging",
  company_name: "Demo Packaging Industries",
  size_label: "Size",
  micron_label: "Micron",
  color_label: "Color / type",
};

const FOREIGN = [/AM Packaging/i, /Ahmed Munir/i, /ampackaging/i];

export default async function branding({ base, browser, ok, pages }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const leaks = await eachPage(context, base, pages || PAGES, async (page) => {
    const text = (await page.locator("body").innerText()) + (await page.title());
    return FOREIGN.filter((re) => re.test(text)).map((re) => `"${re.source}"`);
  });
  ok("no page shows the first client's name", leaks.length === 0, leaks.join("; "));

  const page = await context.newPage();
  await open(page, base, "/login");
  const login = await page.locator("main").innerText();
  ok(
    "sign-in page shows the company name from settings",
    login.includes(demoSettings.short_name) && login.includes(demoSettings.company_name),
    login.slice(0, 160),
  );

  await open(page, base, "/admin/settings?tab=fields");
  const tabs = await page.getByRole("navigation", { name: "Settings sections" }).innerText();
  ok(
    "Settings tabs use the item field names from settings",
    [demoSettings.size_label, demoSettings.micron_label, demoSettings.color_label].every((l) => tabs.includes(l)) && tabs.includes("Item fields"),
    tabs.replace(/\s+/g, " "),
  );
  await context.close();
}
