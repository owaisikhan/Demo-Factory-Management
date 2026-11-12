"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteLookup, saveLookup } from "@/app/_lib/actions";
import FormMessage from "@/app/_components/ui/FormMessage";
import SubmitButton from "@/app/_components/ui/SubmitButton";

// One editable list from Settings (brands, sizes, microns, colors, units,
// categories). fields: [{ name, label, type: "text" | "number" | "kind", placeholder }]
function EditRow({ table, fields, row, onDone }) {
  const [state, formAction] = useActionState(saveLookup, null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <tr>
      <td colSpan={fields.length + 1}>
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <input type="hidden" name="table" value={table} />
          <input type="hidden" name="id" value={row.id} />
          {fields.map((f) => (
            <FieldInput key={f.name} field={f} defaultValue={row[f.name]} />
          ))}
          <div className="flex gap-2">
            <SubmitButton className="btn-primary" pendingLabel="Saving...">
              <Check size={17} aria-hidden /> Save
            </SubmitButton>
            <button type="button" onClick={onDone} className="btn-secondary" aria-label="Cancel">
              <X size={17} aria-hidden />
            </button>
          </div>
        </form>
        <div className="mt-2">
          <FormMessage state={state?.ok ? null : state} />
        </div>
      </td>
    </tr>
  );
}

function FieldInput({ field, defaultValue }) {
  if (field.type === "kind") {
    return (
      <select name={field.name} defaultValue={defaultValue ?? "raw"} aria-label={field.label} className="form-select sm:w-48">
        <option value="raw">Raw material</option>
        <option value="finished">Product</option>
      </select>
    );
  }
  return (
    <input
      name={field.name}
      defaultValue={defaultValue === null || defaultValue === undefined ? "" : String(Number.isFinite(Number(defaultValue)) && field.type === "number" ? Number(defaultValue) : defaultValue)}
      inputMode={field.type === "number" ? "decimal" : undefined}
      placeholder={field.placeholder}
      aria-label={field.label}
      required={!field.optional}
      className="form-input sm:flex-1"
    />
  );
}

function DeleteButton({ table, id, label }) {
  const [state, formAction] = useActionState(deleteLookup, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`Delete ${label}? This cannot be undone.`)) e.preventDefault();
      }}
      className="inline"
    >
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-ghost text-danger-ink hover:bg-[#fee2e2] hover:text-[#dc2626]" aria-label={`Delete ${label}`} title="Delete">
        <Trash2 size={16} aria-hidden />
      </button>
      {state && !state.ok ? <span className="mt-1 block max-w-xs text-left text-xs text-danger-ink">{state.message}</span> : null}
    </form>
  );
}

const fmtNum = (v) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(Number(v));

// Per-list setup. Kept here (not passed from the page) because the column
// renderers are functions, which cannot cross from a server component.
// The size, thickness and colour lists take this client's own words from
// Settings > Item fields.
function configFor(table, itemFields) {
  const f = itemFields;
  const dims = [f.size.width, f.size.length, ...(f.size.height.enabled ? [f.size.height] : [])];
  const CONFIG = {
  item_categories: {
    title: "Categories",
    singular: "category",
    hint: "Groups for raw materials and products. Add a new product type here when the factory starts making one.",
    fields: [
      { name: "name", label: "Name", placeholder: "e.g. Packing Material" },
      { name: "kind", label: "Used for", type: "kind" },
    ],
    display: [
      { label: "Name", render: (r) => r.name, className: "font-semibold text-heading" },
      { label: "Used for", render: (r) => (r.kind === "raw" ? "Raw materials" : "Products"), className: "text-sm text-secondary" },
    ],
  },
  brands: {
    title: "Brands",
    singular: "brand",
    hint: "Brands of the materials you buy and the products you sell.",
    fields: [{ name: "name", label: "Brand name", placeholder: "e.g. Star" }],
    display: [{ label: "Brand", render: (r) => r.name, className: "font-semibold text-heading" }],
  },
  sizes: {
    title: `${f.size.label} list`,
    singular: f.size.label.toLowerCase(),
    hint: `As ${dims.map((d) => `${d.label.toLowerCase()} (${d.unit})`).join(" x ")}. The units are set in Item fields.`,
    fields: [
      { name: "width_mm", label: `${f.size.width.label} (${f.size.width.unit})`, type: "number", placeholder: "e.g. 48" },
      { name: "length_yd", label: `${f.size.length.label} (${f.size.length.unit})`, type: "number", placeholder: "e.g. 72" },
      ...(f.size.height.enabled
        ? [{ name: "height_mm", label: `${f.size.height.label} (${f.size.height.unit})`, type: "number", placeholder: "e.g. 10", optional: true }]
        : []),
    ],
    display: [
      { label: f.size.label, render: (r) => r.label, className: "font-semibold text-heading num" },
      { label: f.size.width.label, render: (r) => `${fmtNum(r.width_mm)} ${f.size.width.unit}`, className: "num text-sm text-secondary" },
      { label: f.size.length.label, render: (r) => `${fmtNum(r.length_yd)} ${f.size.length.unit}`, className: "num text-sm text-secondary" },
      ...(f.size.height.enabled
        ? [{ label: f.size.height.label, render: (r) => (r.height_mm ? `${fmtNum(r.height_mm)} ${f.size.height.unit}` : ""), className: "num text-sm text-secondary" }]
        : []),
    ],
  },
  microns: {
    title: `${f.micron.label} list`,
    singular: f.micron.label.toLowerCase(),
    hint: `The ${f.micron.label.toLowerCase()} options items can have, in ${f.micron.unit}.`,
    fields: [{ name: "value", label: `${f.micron.label} (${f.micron.unit})`, type: "number", placeholder: "e.g. 40" }],
    display: [{ label: f.micron.label, render: (r) => `${fmtNum(r.value)} ${f.micron.unit}`, className: "font-semibold text-heading num" }],
  },
  colors: {
    title: `${f.color.label} list`,
    singular: f.color.label.toLowerCase(),
    hint: "For example a colour, a grade or a finish.",
    fields: [{ name: "name", label: "Name", placeholder: "e.g. Brown" }],
    display: [{ label: f.color.label, render: (r) => r.name, className: "font-semibold text-heading" }],
  },
  units: {
    title: "Units",
    singular: "unit",
    hint: "What items are counted in. The short form shows next to every quantity.",
    fields: [
      { name: "name", label: "Unit name", placeholder: "e.g. Kilogram" },
      { name: "short_name", label: "Short form", placeholder: "e.g. kg" },
    ],
    display: [
      { label: "Unit", render: (r) => r.name, className: "font-semibold text-heading" },
      { label: "Short form", render: (r) => r.short_name, className: "text-sm text-secondary" },
    ],
  },
  };
  return CONFIG[table];
}

export default function LookupManager({ table, rows, itemFields }) {
  const { title, singular, hint, fields, display } = configFor(table, itemFields);
  const [editing, setEditing] = useState(null);
  const [state, formAction] = useActionState(saveLookup, null);
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="card-title">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">Nothing here yet. Add the first one on the right.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {display.map((d, i) => (
                    <th key={d.label} scope="col" className={i > 0 ? "hidden sm:table-cell" : ""}>{d.label}</th>
                  ))}
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) =>
                  editing === row.id ? (
                    <EditRow key={row.id} table={table} fields={fields} row={row} onDone={() => setEditing(null)} />
                  ) : (
                    <tr key={row.id}>
                      {display.map((d, i) =>
                        i === 0 ? (
                          <td key={d.label} className={d.className}>
                            {d.render(row)}
                            {/* On phones the other columns fold into one line here */}
                            {display.length > 1 ? (
                              <span className="mt-0.5 block text-xs font-normal text-muted sm:hidden">
                                {display.slice(1).map((x) => x.render(row)).filter((v) => v !== null && v !== "").map(String).join(" · ")}
                              </span>
                            ) : null}
                          </td>
                        ) : (
                          <td key={d.label} className={`hidden sm:table-cell ${d.className ?? ""}`}>{d.render(row)}</td>
                        ),
                      )}
                      <td className="whitespace-nowrap text-right">
                        <button type="button" onClick={() => setEditing(row.id)} className="btn-ghost" aria-label={`Edit ${display[0].render(row)}`} title="Edit">
                          <Pencil size={16} aria-hidden />
                        </button>
                        <DeleteButton table={table} id={row.id} label={String(display[0].render(row))} />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form ref={formRef} action={formAction} className="card flex flex-col gap-4 self-start p-5 sm:p-6">
        <h3 className="card-title border-b border-border pb-4">Add a {singular}</h3>
        <input type="hidden" name="table" value={table} />
        {fields.map((f) => (
          <div key={f.name}>
            <label className="form-label" htmlFor={`new-${table}-${f.name}`}>
              {f.label}
              {f.optional ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
            </label>
            {f.type === "kind" ? (
              <select id={`new-${table}-${f.name}`} name={f.name} defaultValue="raw" className="form-select">
                <option value="raw">Raw material</option>
                <option value="finished">Product</option>
              </select>
            ) : (
              <input
                id={`new-${table}-${f.name}`}
                name={f.name}
                inputMode={f.type === "number" ? "decimal" : undefined}
                placeholder={f.placeholder}
                required={!f.optional}
                className="form-input"
              />
            )}
          </div>
        ))}
        <FormMessage state={state} />
        <SubmitButton className="btn-primary h-11 w-full" pendingLabel="Adding...">
          <Plus size={18} aria-hidden /> Add
        </SubmitButton>
      </form>
    </div>
  );
}
