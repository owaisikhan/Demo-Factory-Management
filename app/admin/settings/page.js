import Link from "next/link";
import { requirePageRole, ROLES } from "@/app/_lib/helpers";
import { getItemOptions, getLookups, getRecipe, getSettings } from "@/app/_lib/data-service";
import { itemFields } from "@/app/_lib/item-fields";
import PageHeader from "@/app/_components/layout/PageHeader";
import CompanySettingsForm from "@/app/_components/admin/CompanySettingsForm";
import LookupManager from "@/app/_components/admin/LookupManager";
import ItemFieldsForm from "@/app/_components/admin/ItemFieldsForm";
import { ClearDataButton, FillSampleButton } from "@/app/_components/admin/DemoDataButtons";
import { isDemoMode } from "@/app/_lib/config";
import { readLog } from "@/app/_lib/local-db/oplog";
import RecipeEditor from "@/app/_components/admin/RecipeEditor";

export const metadata = { title: "Settings" };

// The size, thickness and colour tabs carry this client's own names and
// hide when the field is switched off in Item fields.
function tabsFor(fields) {
  return [
    { key: "company", label: "Company & Invoice" },
    { key: "fields", label: "Item fields" },
    { key: "categories", label: "Categories", table: "item_categories", lookup: "categories" },
    { key: "brands", label: "Brands", table: "brands", lookup: "brands" },
    fields.size.enabled && { key: "sizes", label: fields.size.label, table: "sizes", lookup: "sizes" },
    fields.micron.enabled && { key: "microns", label: fields.micron.label, table: "microns", lookup: "microns" },
    fields.color.enabled && { key: "colors", label: fields.color.label, table: "colors", lookup: "colors" },
    { key: "units", label: "Units", table: "units", lookup: "units" },
    { key: "recipes", label: "Recipes" },
    isDemoMode && { key: "demo", label: "Demo data" },
  ].filter(Boolean);
}

export default async function SettingsPage({ searchParams }) {
  await requirePageRole(ROLES.ADMIN);
  const [sp, settings] = await Promise.all([searchParams, getSettings()]);
  const fields = itemFields(settings);
  const TABS = tabsFor(fields);
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0];

  let body;
  if (tab.key === "company") {
    body = <CompanySettingsForm settings={settings} />;
  } else if (tab.key === "demo") {
    const log = await readLog();
    const entries = log.ops.length;
    body = (
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="card-title border-b border-border pb-4">Data in this browser</h2>
          <p className="mt-4 text-sm text-secondary">
            This is a demo: everything is saved in this browser only, not online. Another phone or laptop has its own copy.
          </p>
          <p className="mt-3 text-sm font-medium text-heading">
            {log.base === "sample" ? "Started from the sample data" : "Started empty"}
            {entries ? `, plus ${entries} ${entries === 1 ? "entry" : "entries"} you made.` : ", nothing entered since."}
          </p>
          <div className="mt-5">
            <FillSampleButton />
          </div>
        </section>
        <section className="card border-[#fecaca] p-5 sm:p-6 dark:border-[#7f1d1d]">
          <h2 className="card-title border-b border-border pb-4">Clear all data</h2>
          <p className="mt-4 text-sm text-secondary">
            Removes every item, invoice, purchase, production run, customer, supplier and user entered in this browser, and the
            sample data. The app starts empty. This cannot be undone.
          </p>
          <div className="mt-5">
            <ClearDataButton />
          </div>
        </section>
      </div>
    );
  } else if (tab.key === "fields") {
    body = <ItemFieldsForm settings={settings} />;
  } else if (tab.key === "recipes") {
    const [products, rawItems, recipe] = await Promise.all([
      getItemOptions("finished"),
      getItemOptions("raw"),
      sp.product ? getRecipe(sp.product) : null,
    ]);
    body = <RecipeEditor key={sp.product ?? "none"} products={products} rawItems={rawItems} productId={sp.product} recipe={recipe} />;
  } else {
    const lookups = await getLookups();
    body = <LookupManager table={tab.table} rows={lookups[tab.lookup]} itemFields={fields} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        subtitle="Company details for invoices, the details your items carry, and the lists used across the app. Changes are recorded in the activity log."
        crumbs={[{ label: "Home", href: "/admin" }, { label: "Settings" }]}
        actions={
          <Link href="/admin/users" className="btn-secondary">
            Manage users
          </Link>
        }
      />
      <nav aria-label="Settings sections" className="card px-2">
        <ul className="flex flex-wrap">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={`/admin/settings?tab=${t.key}`}
                aria-current={t.key === tab.key ? "page" : undefined}
                className={`-mb-px flex min-h-[48px] items-center border-b-2 px-4 text-sm font-medium transition-colors ${
                  t.key === tab.key ? "border-primary font-semibold text-primary-ink" : "border-transparent text-muted hover:text-text"
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {body}
    </div>
  );
}
