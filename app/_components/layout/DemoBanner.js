"use client";

import { useActionState } from "react";
import { Database, Eraser, Sparkles } from "lucide-react";
import { clearLocalData, loadSampleData } from "@/app/_lib/actions";
import SubmitButton from "@/app/_components/ui/SubmitButton";
import FormMessage from "@/app/_components/ui/FormMessage";

// Local (demo) mode bar: everything the visitor enters is saved in their own
// browser. They can start from sample data or wipe it all and start empty.
export default function DemoBanner({ base, entries }) {
  const [fillState, fill] = useActionState(loadSampleData, null);
  const [clearState, clear] = useActionState(clearLocalData, null);
  const confirm = (text) => (e) => {
    if (!window.confirm(text)) e.preventDefault();
  };
  const what =
    base === "sample"
      ? `Sample data is loaded${entries ? `, plus ${entries} ${entries === 1 ? "entry" : "entries"} of yours` : ""}.`
      : entries
        ? `${entries} ${entries === 1 ? "entry" : "entries"} of yours so far.`
        : "Nothing entered yet. Start empty, or fill it with a month of sample data.";

  return (
    <div className="no-print mb-5 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm text-[#1e40af] dark:border-[#1e3a5f] dark:bg-[#172554] dark:text-[#93c5fd]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <p className="flex min-w-[220px] flex-1 items-start gap-3">
          <Database size={18} className="mt-px shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Demo.</span> Everything you enter is saved in this browser only. {what}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <form action={fill} onSubmit={confirm("Fill with sample data? A month of sample stock, production, purchases and sales replaces what is here now.")}>
            <SubmitButton className="btn-primary h-11" pendingLabel="Filling...">
              <Sparkles size={17} aria-hidden /> Fill with sample data
            </SubmitButton>
          </form>
          <form action={clear} onSubmit={confirm("Clear all? Everything entered in this browser is removed and the app starts empty.")}>
            <SubmitButton className="btn-secondary h-11" pendingLabel="Clearing...">
              <Eraser size={17} aria-hidden /> Clear all
            </SubmitButton>
          </form>
        </div>
      </div>
      {fillState && !fillState.ok ? <div className="mt-2"><FormMessage state={fillState} /></div> : null}
      {clearState && !clearState.ok ? <div className="mt-2"><FormMessage state={clearState} /></div> : null}
    </div>
  );
}
