"use client";

import { useActionState } from "react";
import { Eraser, Sparkles } from "lucide-react";
import clsx from "clsx";
import { clearLocalData, loadSampleData } from "@/app/_lib/actions";
import SubmitButton from "@/app/_components/ui/SubmitButton";
import FormMessage from "@/app/_components/ui/FormMessage";

// Demo mode only: the two buttons that start this browser's data again.
// Fill sits on the Dashboard, Clear all in Settings > Demo data.

function confirmFirst(text) {
  return (e) => {
    if (!window.confirm(text)) e.preventDefault();
  };
}

const FILL_CONFIRM = "Fill with sample data? A month of sample stock, production, purchases and sales replaces what is in this browser now.";
const CLEAR_CONFIRM = "Clear all data? Everything entered in this browser is removed and the app starts empty. This cannot be undone.";

// variant "banner": white outline on the green welcome banner; "primary": a normal green button
export function FillSampleButton({ variant = "primary", className }) {
  const [state, action] = useActionState(loadSampleData, null);
  return (
    <form action={action} onSubmit={confirmFirst(FILL_CONFIRM)} className={className}>
      <SubmitButton
        pendingLabel="Filling..."
        className={clsx(
          variant === "banner"
            ? "inline-flex min-h-[40px] pointer-coarse:min-h-[44px] items-center gap-2 rounded-[10px] border border-white/25 bg-white/10 px-4 text-[13px] font-medium text-white hover:bg-white/20"
            : "btn-primary h-11",
        )}
      >
        <Sparkles size={variant === "banner" ? 15 : 17} aria-hidden /> Fill with sample data
      </SubmitButton>
      {state && !state.ok ? <div className="mt-2"><FormMessage state={state} /></div> : null}
    </form>
  );
}

export function ClearDataButton() {
  const [state, action] = useActionState(clearLocalData, null);
  return (
    <form action={action} onSubmit={confirmFirst(CLEAR_CONFIRM)}>
      <SubmitButton pendingLabel="Clearing..." className="btn-danger h-11">
        <Eraser size={17} aria-hidden /> Clear all data
      </SubmitButton>
      {state ? <div className="mt-3"><FormMessage state={state} /></div> : null}
    </form>
  );
}
