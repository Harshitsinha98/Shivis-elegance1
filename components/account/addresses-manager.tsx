"use client";

import * as React from "react";
import { Plus, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddressFormDialog } from "@/components/account/address-form-dialog";
import type { Address } from "@/types/user";

export function AddressesManager({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses] = React.useState<Address[]>(initialAddresses);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Address | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(address: Address) {
    setEditing(address);
    setDialogOpen(true);
  }

  function handleSaved(address: Address) {
    setAddresses((prev) => {
      const withoutDefaultClash = address.isDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : prev;
      const exists = withoutDefaultClash.some((a) => a.id === address.id);
      return exists
        ? withoutDefaultClash.map((a) => (a.id === address.id ? address : a))
        : [...withoutDefaultClash, address];
    });
  }

  async function handleRemove(id: string) {
    if (!window.confirm("Remove this address?")) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-obsidian">Saved addresses</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={15} /> Add address
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border bg-pearl p-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium text-obsidian">
                <MapPin size={16} className="text-champagne-dark" /> {a.label}
              </span>
              {a.isDefault && <Badge tone="gold">Default</Badge>}
            </div>
            <div className="mt-3 space-y-0.5 text-sm text-elegant-gray">
              <p className="font-medium text-obsidian">{a.fullName}</p>
              <p>{a.line1}</p>
              {a.line2 && <p>{a.line2}</p>}
              <p>
                {a.city}, {a.state} {a.postalCode}
              </p>
              <p>{a.country}</p>
              <p className="pt-1 text-warm-gray">{a.phone}</p>
            </div>
            <div className="mt-4 flex gap-4 text-xs text-champagne-dark">
              <button className="hover:underline" onClick={() => openEdit(a)}>
                Edit
              </button>
              <button
                className="text-warm-gray hover:text-red-500 disabled:opacity-50"
                onClick={() => handleRemove(a.id)}
                disabled={removingId === a.id}
              >
                {removingId === a.id ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={openCreate}
          className="grid min-h-[180px] place-items-center rounded-2xl border border-dashed border-border text-warm-gray transition hover:border-champagne hover:text-obsidian"
        >
          <span className="flex flex-col items-center gap-2">
            <Plus size={22} />
            Add a new address
          </span>
        </button>
      </div>

      <AddressFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
