import Link from "next/link";
import { Database } from "lucide-react";

// Demo mode: everything the visitor enters is saved in their own browser.
// The buttons live where they are used: Fill with sample data on the
// Dashboard, Clear all data in Settings > Demo data.
export default function DemoBanner({ base, entries }) {
  const what =
    base === "sample"
      ? `Sample data is loaded${entries ? `, plus ${entries} ${entries === 1 ? "entry" : "entries"} of yours` : ""}.`
      : entries
        ? `${entries} ${entries === 1 ? "entry" : "entries"} of yours so far.`
        : "Nothing entered yet.";

  return (
    <div className="no-print mb-5 flex items-start gap-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm text-[#1e40af] dark:border-[#1e3a5f] dark:bg-[#172554] dark:text-[#93c5fd]">
      <Database size={18} className="mt-px shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">Demo.</span> Everything you enter is saved in this browser only. {what}{" "}
        <Link href="/admin/settings?tab=demo" className="tap-inline font-semibold underline underline-offset-2">
          Demo data
        </Link>
      </p>
    </div>
  );
}
