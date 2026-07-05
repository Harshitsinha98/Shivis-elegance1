import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listCollections } from "@/lib/db/repo";
import { PageHeader } from "@/components/shared/page-header";
import { ScrollReveal, StaggerGroup } from "@/components/shared/scroll-reveal";

export const metadata = { title: "Collections" };
export const revalidate = 60;

export default async function CollectionsPage() {
  const COLLECTIONS = await listCollections();
  return (
    <>
      <PageHeader
        eyebrow="Curated by our jewellers"
        title="Collections"
        subtitle="Six edits, each with its own character — from red-carpet diamonds to everyday gold."
        crumbs={[{ label: "Home", href: "/" }, { label: "Collections" }]}
      />

      <StaggerGroup className="container-luxe grid gap-6 py-14 md:grid-cols-2">
        {COLLECTIONS.map((col) => (
          <ScrollReveal key={col.slug}>
            <Link
              href={`/collections/${col.slug}`}
              className="group relative block aspect-[16/10] overflow-hidden rounded-2xl"
            >
              <img
                src={col.heroImage}
                alt={col.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/75 via-obsidian/20 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 text-ivory">
                <p className="text-xs uppercase tracking-[0.2em] text-champagne-light">
                  {col.productSlugs.length} pieces
                </p>
                <h2 className="mt-2 font-display text-3xl">{col.name}</h2>
                <p className="mt-1 max-w-md text-sm text-ivory/80">{col.description}</p>
                <span className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-champagne-light">
                  Explore <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </StaggerGroup>
    </>
  );
}
