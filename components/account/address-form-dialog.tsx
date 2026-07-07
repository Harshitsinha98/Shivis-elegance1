"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Address } from "@/types/user";

interface AddressFormDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: Address | null;
  onSaved: (address: Address) => void;
}

type FormState = Omit<Address, "id">;

const EMPTY_FORM: FormState = {
  label: "",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false,
};

export function AddressFormDialog({ open, onClose, initial, onSaved }: AddressFormDialogProps) {
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(initial ? { ...initial } : EMPTY_FORM);
  }, [open, initial]);

  const field =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(initial ? `/api/addresses/${initial.id}` : "/api/addresses", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        return;
      }
      onSaved(json.data.address as Address);
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Edit address" : "Add address"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Label" placeholder="Home, Office…" value={form.label} onChange={field("label")} required />
          <Input label="Full name" value={form.fullName} onChange={field("fullName")} required />
        </div>
        <Input label="Phone" type="tel" value={form.phone} onChange={field("phone")} required />
        <Input label="Address line 1" value={form.line1} onChange={field("line1")} required />
        <Input label="Address line 2 (optional)" value={form.line2 ?? ""} onChange={field("line2")} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="City" value={form.city} onChange={field("city")} required />
          <Input label="State" value={form.state} onChange={field("state")} required />
          <Input label="Postal code" value={form.postalCode} onChange={field("postalCode")} required />
        </div>
        <Input label="Country" value={form.country} onChange={field("country")} required />

        <label className="flex items-center gap-2 text-sm text-elegant-gray">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
            className="h-4 w-4 rounded border-border accent-champagne"
          />
          Set as default address
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save address"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
