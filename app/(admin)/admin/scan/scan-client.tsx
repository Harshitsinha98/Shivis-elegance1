"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, CameraOff, Check, AlertCircle, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scanAddStockAction } from "@/lib/admin/actions";

interface ScanLog {
  sku: string;
  name: string;
  stock: number;
  qty: number;
  mode: "add" | "set";
}

export function ScanClient() {
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("1");
  const [mode, setMode] = useState<"add" | "set">("add");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<ScanLog[]>([]);
  const [pending, startTransition] = useTransition();

  const scannerRef = useRef<any>(null);
  const skuRef = useRef<HTMLInputElement>(null);

  // Tear down the camera on unmount.
  useEffect(() => {
    return () => {
      scannerRef.current?.stop?.().catch(() => {});
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded: string) => {
          setSku(decoded.trim().toUpperCase());
          stopCamera();
          skuRef.current?.focus();
        },
        () => {}
      );
    } catch (e: any) {
      setScanning(false);
      setError(e?.message ?? "Could not access camera. Type the SKU instead.");
    }
  };

  const stopCamera = async () => {
    try {
      await scannerRef.current?.stop?.();
      scannerRef.current?.clear?.();
    } catch {
      /* ignore */
    }
    scannerRef.current = null;
    setScanning(false);
  };

  const submit = () => {
    setError(null);
    if (!sku.trim()) {
      setError("Scan or enter a SKU first");
      return;
    }
    startTransition(async () => {
      const res = await scanAddStockAction(sku.trim(), Number(qty) || 0, mode);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.data) {
        setLog((l) => [
          { sku: sku.trim().toUpperCase(), name: res.data!.name, stock: res.data!.stock, qty: Number(qty) || 0, mode },
          ...l,
        ]);
      }
      setSku("");
      setQty("1");
      skuRef.current?.focus();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Scanner + form */}
      <div className="space-y-5 rounded-2xl border border-border bg-pearl p-6">
        <div className="overflow-hidden rounded-xl border border-border bg-obsidian/5">
          <div id="qr-reader" className="mx-auto aspect-square w-full max-w-sm" />
          {!scanning && (
            <div className="grid aspect-square w-full max-w-sm mx-auto -mt-[100%] place-items-center text-center text-warm-gray">
              <div>
                <Camera size={32} className="mx-auto text-champagne-dark" />
                <p className="mt-2 text-sm">Point the camera at a product QR label</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!scanning ? (
            <Button type="button" variant="outline" fullWidth onClick={startCamera}>
              <Camera size={16} /> Start camera
            </Button>
          ) : (
            <Button type="button" variant="outline" fullWidth onClick={stopCamera}>
              <CameraOff size={16} /> Stop camera
            </Button>
          )}
        </div>

        <div className="space-y-4 border-t border-border pt-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-warm-gray">SKU</label>
            <input
              ref={skuRef}
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Scan, or type / use a barcode gun"
              className="w-full rounded-lg border border-border bg-ivory px-4 py-3 font-mono text-sm focus:border-champagne focus:outline-none"
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-warm-gray">Quantity</label>
              <input
                type="number"
                min={0}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-lg border border-border bg-ivory px-4 py-3 text-sm focus:border-champagne focus:outline-none"
              />
            </div>
            <div className="flex rounded-lg border border-border p-1">
              {(["add", "set"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-md px-3 py-2 text-xs font-medium capitalize transition ${
                    mode === m ? "bg-champagne text-pearl" : "text-warm-gray hover:text-obsidian"
                  }`}
                >
                  {m === "add" ? "Add to" : "Set to"}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <Button type="button" fullWidth size="lg" onClick={submit} disabled={pending}>
            <PackagePlus size={16} /> {pending ? "Updating…" : mode === "add" ? "Add stock" : "Set stock"}
          </Button>
        </div>
      </div>

      {/* Session log */}
      <div className="rounded-2xl border border-border bg-pearl p-6">
        <h3 className="font-display text-xl text-obsidian">This session</h3>
        <p className="text-sm text-warm-gray">Stock updates you&apos;ve made</p>
        {log.length === 0 ? (
          <p className="mt-6 text-sm text-warm-gray">Nothing scanned yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {log.map((l, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border border-border bg-ivory px-4 py-3">
                <div>
                  <p className="font-medium text-obsidian">{l.name}</p>
                  <p className="font-mono text-xs text-warm-gray">{l.sku}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={15} className="text-green-600" />
                  <span className="text-warm-gray">
                    {l.mode === "add" ? `+${l.qty} → ` : "set → "}
                  </span>
                  <span className="font-medium text-obsidian">{l.stock}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
