"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { saveItemFields } from "@/app/_lib/actions";
import FormMessage from "@/app/_components/ui/FormMessage";
import SubmitButton from "@/app/_components/ui/SubmitButton";

function Text({ label, name, defaultValue, placeholder, hint }) {
  return (
    <div>
      <label htmlFor={`if-${name}`} className="form-label">{label}</label>
      <input id={`if-${name}`} name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} className="form-input" />
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Toggle({ name, defaultChecked, children }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-border px-4 sm:col-span-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-5 w-5 accent-[var(--color-primary)]" />
      <span className="text-sm font-medium text-heading">{children}</span>
    </label>
  );
}

function Section({ title, hint, children, className = "" }) {
  return (
    <div className={`card p-5 sm:p-6 ${className}`}>
      <h2 className="card-title border-b border-border pb-4">{title}</h2>
      {hint ? <p className="mt-3 text-xs text-muted">{hint}</p> : null}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </div>
  );
}

// The extra details items have, and what this factory calls them. A tape
// maker has Size (mm x yd), Micron and Rolls per carton; a carton maker has
// Size (L x W x H in inches), Ply and Pieces per bundle. Switching a field
// off hides it on forms and lists; values already saved are kept.
export default function ItemFieldsForm({ settings }) {
  const [state, formAction] = useActionState(saveItemFields, null);
  const s = settings ?? {};

  return (
    <form action={formAction} className="grid gap-6 xl:grid-cols-2">
      <Section className="self-start" title="Size" hint="Sizes are picked from a list (Settings, the size tab). Changing a unit rewrites every size name.">
        <Toggle name="size_enabled" defaultChecked={s.size_enabled}>Items have a size</Toggle>
        <Text label="Name of the field" name="size_label" defaultValue={s.size_label} placeholder="e.g. Size" />
        <div className="hidden sm:block" aria-hidden />
        <Text label="First measure" name="size_width_label" defaultValue={s.size_width_label} placeholder="e.g. Width" />
        <Text label="Its unit" name="size_width_unit" defaultValue={s.size_width_unit} placeholder="e.g. mm" />
        <Text label="Second measure" name="size_length_label" defaultValue={s.size_length_label} placeholder="e.g. Length" />
        <Text label="Its unit" name="size_length_unit" defaultValue={s.size_length_unit} placeholder="e.g. yd" />
        <Toggle name="size_height_enabled" defaultChecked={s.size_height_enabled}>Sizes have a third measure (for boxes: height)</Toggle>
        <Text label="Third measure" name="size_height_label" defaultValue={s.size_height_label} placeholder="e.g. Height" />
        <Text label="Its unit" name="size_height_unit" defaultValue={s.size_height_unit} placeholder="e.g. in" />
      </Section>

      <div className="flex flex-col gap-6">
        <Section title="Thickness or grade" hint="One number per item from a list, for example micron for film, gsm for paper, gauge for bags.">
          <Toggle name="micron_enabled" defaultChecked={s.micron_enabled}>Items have this number</Toggle>
          <Text label="Name of the field" name="micron_label" defaultValue={s.micron_label} placeholder="e.g. Micron" />
          <Text label="Shown after the number" name="micron_unit" defaultValue={s.micron_unit} placeholder="e.g. micron" />
        </Section>

        <Section title="Colour, type or grade" hint="A name picked from a list, for example Clear, Brown, 3 Ply, Grade A.">
          <Toggle name="color_enabled" defaultChecked={s.color_enabled}>Items have this</Toggle>
          <Text label="Name of the field" name="color_label" defaultValue={s.color_label} placeholder="e.g. Color / type" />
        </Section>

        <Section title="Pack count (products only)" hint="How many pieces go in one unit of sale, for example rolls in a carton.">
          <Toggle name="pack_enabled" defaultChecked={s.pack_enabled}>Products have a pack count</Toggle>
          <Text label="Name of the field" name="pack_label" defaultValue={s.pack_label} placeholder="e.g. Rolls per carton" />
          <Text label="Shown after the number" name="pack_unit" defaultValue={s.pack_unit} placeholder="e.g. rolls/ctn" />
        </Section>

        <FormMessage state={state} />
        <SubmitButton className="btn-primary h-12 w-full text-[15px]">
          <Save size={18} aria-hidden /> Save item fields
        </SubmitButton>
      </div>
    </form>
  );
}
