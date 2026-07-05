import { Plus, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await getCurrentUser();
  const addresses = user?.addresses ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-obsidian">Saved addresses</h2>
        <Button size="sm">
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
              <p>{a.city}, {a.state} {a.postalCode}</p>
              <p>{a.country}</p>
              <p className="pt-1 text-warm-gray">{a.phone}</p>
            </div>
            <div className="mt-4 flex gap-4 text-xs text-champagne-dark">
              <button className="hover:underline">Edit</button>
              <button className="text-warm-gray hover:text-red-500">Remove</button>
            </div>
          </div>
        ))}

        <button className="grid min-h-[180px] place-items-center rounded-2xl border border-dashed border-border text-warm-gray transition hover:border-champagne hover:text-obsidian">
          <span className="flex flex-col items-center gap-2">
            <Plus size={22} />
            Add a new address
          </span>
        </button>
      </div>
    </div>
  );
}
