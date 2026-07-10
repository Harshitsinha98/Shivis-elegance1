"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Upload, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/toast-store";
import { formatPrice } from "@/lib/utils";
import { getUploadConfig } from "@/lib/storage/cloudinary";
import { RETURN_REASONS } from "@/types/order";
import type { Order } from "@/types/order";

interface Selection {
  [orderItemId: string]: number; // quantity selected
}

export function ReturnRequestDialog({ order }: { order: Order }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [selection, setSelection] = useState<Selection>({});
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Only lines with a resolvable OrderItem id can be returned.
  const returnable = order.items.filter((it) => it.id);

  function toggle(id: string, max: number) {
    setSelection((s) => {
      const next = { ...s };
      if (next[id]) delete next[id];
      else next[id] = Math.min(1, max) || 1;
      return next;
    });
  }

  function setQty(id: string, qty: number) {
    setSelection((s) => ({ ...s, [id]: qty }));
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const cfg = getUploadConfig();
    if (!cfg.enabled || !cfg.endpoint || !cfg.uploadPreset) {
      toast.error("Image uploads aren't configured. You can still submit without photos.");
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 5)) {
        const form = new FormData();
        form.append("file", file);
        form.append("upload_preset", cfg.uploadPreset);
        const res = await fetch(cfg.endpoint, { method: "POST", body: form });
        const json = await res.json();
        if (json.secure_url) uploaded.push(json.secure_url as string);
      }
      setImages((prev) => [...prev, ...uploaded].slice(0, 5));
    } catch {
      toast.error("Could not upload one or more images.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    const items = Object.entries(selection)
      .filter(([, qty]) => qty > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

    if (!items.length) {
      toast.error("Select at least one item to return.");
      return;
    }
    if (!reason) {
      toast.error("Please choose a return reason.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.number)}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, description: description.trim() || undefined, images, items }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Could not submit your return request.");
        return;
      }
      toast.success("Return request submitted. We'll be in touch soon.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <RotateCcw size={14} /> Request return
      </Button>

      <Dialog
        open={open}
        onClose={() => !loading && setOpen(false)}
        title="Request a return"
        className="max-w-xl"
      >
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <p className="text-sm text-warm-gray">
            Choose the items you&apos;d like to return from order{" "}
            <strong className="text-obsidian">{order.number}</strong>.
          </p>

          {/* Items */}
          <div className="space-y-2">
            {returnable.map((item) => {
              const id = item.id!;
              const selected = id in selection;
              return (
                <div
                  key={id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                    selected ? "border-champagne bg-blush/30" : "border-border bg-ivory"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggle(id, item.quantity)}
                    className="h-4 w-4 accent-champagne-dark"
                  />
                  <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-obsidian">{item.name}</p>
                    <p className="text-xs text-warm-gray">
                      {formatPrice(item.unitPrice)} · ordered {item.quantity}
                    </p>
                  </div>
                  {selected && item.quantity > 1 && (
                    <select
                      value={selection[id]}
                      onChange={(e) => setQty(id, Number(e.target.value))}
                      className="rounded-lg border border-border bg-pearl px-2 py-1 text-sm"
                    >
                      {Array.from({ length: item.quantity }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-warm-gray">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-border bg-ivory px-3 py-2.5 text-sm focus:border-champagne focus:outline-none"
            >
              <option value="">Select a reason…</option>
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-warm-gray">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add any details that help us process your return…"
              className="w-full rounded-lg border border-border bg-ivory px-3 py-2.5 text-sm focus:border-champagne focus:outline-none"
            />
          </div>

          {/* Images */}
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-warm-gray">
              Photos (optional)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {images.map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((u) => u !== url))}
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-obsidian text-ivory"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-ivory text-warm-gray hover:border-champagne">
                <Upload size={16} />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onFiles(e.target.files)}
                />
              </label>
            </div>
            {uploading && <p className="mt-1 text-xs text-warm-gray">Uploading…</p>}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="ghost" size="sm" disabled={loading} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={loading || uploading} onClick={submit}>
            {loading ? "Submitting…" : "Submit return"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
