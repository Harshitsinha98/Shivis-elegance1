import Link from "next/link";
import { ScrollReveal } from "./scroll-reveal";

interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  crumbs,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  crumbs?: Crumb[];
}) {
  return (
    <header className="border-b border-border bg-cream/60">
      <div className="container-luxe py-14 text-center">
        {crumbs && (
          <nav className="mb-4 flex items-center justify-center gap-2 text-xs text-warm-gray">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                {c.href ? (
                  <Link href={c.href} className="hover:text-obsidian">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-obsidian">{c.label}</span>
                )}
                {i < crumbs.length - 1 && <span>/</span>}
              </span>
            ))}
          </nav>
        )}
        <ScrollReveal>
          {eyebrow && (
            <p className="text-xs uppercase tracking-[0.3em] text-champagne-dark">{eyebrow}</p>
          )}
          <h1 className="mt-3 font-display text-4xl text-obsidian md:text-6xl">{title}</h1>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-warm-gray">{subtitle}</p>
          )}
        </ScrollReveal>
      </div>
    </header>
  );
}
