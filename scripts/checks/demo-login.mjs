// The public demo asks for the shared demo account before showing anything
// (the user: "create username test@gmail.com and password 12341234 for this
// app"), and remembers it in the browser so the visitor stays signed in.
import { open } from "./pages.mjs";

export default async function demoLogin({ base, browser, ok, demo }) {
  const context = await browser.newContext({ signedOut: true, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${base}/admin/stock`, { waitUntil: "load" });
  ok("signed out, an /admin page goes to the sign-in page", /\/login\?next=%2Fadmin%2Fstock$/.test(page.url()), page.url());

  await page.fill("#email", demo.email);
  await page.fill("#password", "wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(1200);
  const err = await page.locator("form").innerText();
  const kept = await page.inputValue("#email");
  ok("a wrong password is refused with a message", page.url().includes("/login") && /do not match/.test(err), err.replace(/\s+/g, " ").slice(0, 120));
  ok("the email stays filled in after a wrong password", kept === demo.email, `"${kept}"`);

  await page.fill("#password", demo.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/stock/, { timeout: 8000 }).catch(() => {});
  ok("the demo account signs in and returns to the page asked for", /\/admin\/stock$/.test(page.url()), page.url());

  const cookie = (await context.cookies()).find((c) => c.name === "factory_demo_session");
  const days = cookie ? (cookie.expires * 1000 - Date.now()) / 86400000 : 0;
  ok("the browser keeps the sign-in for about 30 days", days > 29 && days <= 30.01 && cookie.httpOnly, `${days.toFixed(1)} days, httpOnly ${cookie?.httpOnly}`);

  await open(page, base, "/login");
  ok("signed in, the sign-in page goes straight to the dashboard", /\/admin$/.test(page.url()), page.url());
  await context.close();
}
