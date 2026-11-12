import { Inter } from "next/font/google";
import "@/app/_styles/globals.css";
import { siteConfig } from "@/app/_lib/siteConfig";
import { getBranding } from "@/app/_lib/data-service";
import { PREPAINT_SCRIPT } from "@/app/_components/layout/themeState";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Page titles carry the client's short name ("Stock | Khan Cartons").
export async function generateMetadata() {
  const brand = await getBranding();
  return {
    title: { default: brand.short_name, template: `%s | ${brand.short_name}` },
    description: `${brand.company_name}: stock, production, purchases and sales. ${siteConfig.productName}.`,
    robots: { index: false, follow: false },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#22b573",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
