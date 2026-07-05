import { ScanClient } from "./scan-client";

export const metadata = { title: "Scan · Admin" };

export default function AdminScanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-obsidian">Quick stock</h1>
        <p className="text-warm-gray">
          Scan a product&apos;s QR label (or type its SKU) and update stock in one step —
          no need to re-add the same product each time.
        </p>
      </div>
      <ScanClient />
    </div>
  );
}
