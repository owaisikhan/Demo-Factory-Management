import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/app/_lib/helpers";
import { getBranding, getLowStockAlerts, getStockCounts } from "@/app/_lib/data-service";
import { isDemoMode } from "@/app/_lib/config";
import { readLog } from "@/app/_lib/local-db/oplog";
import { siteConfig } from "@/app/_lib/siteConfig";
import Sidebar from "@/app/_components/layout/Sidebar";
import Header from "@/app/_components/layout/Header";
import Footer from "@/app/_components/layout/Footer";
import DemoBanner from "@/app/_components/layout/DemoBanner";
import { NavigationProgressProvider, PendingRegion } from "@/app/_components/layout/NavigationProgress";

// The signed-in shell. The gate lives here so every page under /admin is
// covered by default; each admin-only page checks the role again, and RLS
// refuses regardless.
export default async function AdminLayout({ children }) {
  // Always render per request: these pages show live stock and the signed-in user.
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [alerts, counts, brand, log] = await Promise.all([getLowStockAlerts(), getStockCounts(), getBranding(), isDemoMode ? readLog() : null]);

  return (
    <Suspense>
      <NavigationProgressProvider>
        <Sidebar user={user} appName={brand.short_name} appTagline={siteConfig.productTagline} />
        <div className="app-main">
          <Header user={user} alerts={alerts} alertCount={counts.low + counts.out} />
          <main className="flex-1 px-4 py-6 sm:px-6">
            {isDemoMode ? <DemoBanner base={log.base} entries={log.ops.length} /> : null}
            <PendingRegion>{children}</PendingRegion>
          </main>
          <Footer companyName={brand.company_name} />
        </div>
      </NavigationProgressProvider>
    </Suspense>
  );
}
