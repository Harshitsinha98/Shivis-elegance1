import Link from "next/link";
import { Instagram, Facebook, Mail, Phone, MapPin } from "lucide-react";
import { SITE, FOOTER_LINKS } from "@/lib/constants";
import { Newsletter } from "@/components/home/newsletter";

export function Footer() {
  return (
    <footer className="mt-24 bg-obsidian text-ivory">
      <Newsletter />

      <div className="container-luxe grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="font-display text-3xl tracking-[0.18em]">{SITE.name.toUpperCase()}</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory/60">
            {SITE.tagline}. Ethically sourced, hallmarked, and handcrafted in India since 1998.
          </p>
          <div className="mt-6 space-y-2 text-sm text-ivory/70">
            <p className="flex items-center gap-2">
              <MapPin size={15} className="text-champagne" /> {SITE.address}
            </p>
            <p className="flex items-center gap-2">
              <Phone size={15} className="text-champagne" /> {SITE.phone}
            </p>
            <p className="flex items-center gap-2">
              <Mail size={15} className="text-champagne" /> {SITE.email}
            </p>
          </div>
        </div>

        {Object.entries(FOOTER_LINKS).map(([group, links]) => (
          <div key={group}>
            <h4 className="text-xs uppercase tracking-[0.16em] text-champagne">{group}</h4>
            <ul className="mt-4 space-y-3 text-sm text-ivory/70">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition hover:text-champagne">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-ivory/10">
        <div className="container-luxe flex flex-col items-center justify-between gap-4 py-6 text-xs text-ivory/50 md:flex-row">
          <p>© 2026 {SITE.name}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href={SITE.social.instagram} aria-label="Instagram" className="hover:text-champagne">
              <Instagram size={18} />
            </a>
            <a href={SITE.social.facebook} aria-label="Facebook" className="hover:text-champagne">
              <Facebook size={18} />
            </a>
          </div>
          <p>BIS Hallmarked · GIA Certified · Secure payments</p>
        </div>
      </div>
    </footer>
  );
}
