import Link from "next/link";
import { SITE } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-blush via-ivory to-cream">
      {/* soft decorative glow */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-wine/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-champagne/10 blur-3xl" />

      <header className="relative z-10 px-6 py-6 sm:px-10">
        <Link
          href="/"
          className="font-display text-2xl tracking-[0.18em] text-obsidian"
        >
          {SITE.name.toUpperCase()}
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-14">
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
