/**
 * Seeds Postgres with the Shivis Elegance catalogue so the storefront reads real
 * data. Mirrors `lib/mock-data.ts` and is idempotent (safe to re-run).
 *
 *   npm run prisma:generate && npm run prisma:push && npm run prisma:seed
 */
import { PrismaClient } from "@prisma/client";
import {
  CATEGORY_DATA,
  COLLECTIONS,
  PRODUCTS,
  REVIEWS,
  COUPONS,
} from "../lib/mock-data";

const prisma = new PrismaClient();

async function main() {
  console.log("→ Seeding categories…");
  for (const c of CATEGORY_DATA) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, image: c.image },
      create: { slug: c.slug, name: c.name, image: c.image },
    });
  }

  console.log("→ Seeding collections…");
  for (const col of COLLECTIONS) {
    await prisma.collection.upsert({
      where: { slug: col.slug },
      update: {
        name: col.name,
        description: col.description,
        heroImage: col.heroImage,
        featured: Boolean(col.featured),
      },
      create: {
        slug: col.slug,
        name: col.name,
        description: col.description,
        heroImage: col.heroImage,
        featured: Boolean(col.featured),
      },
    });
  }

  console.log("→ Seeding products…");
  for (const p of PRODUCTS) {
    const category = await prisma.category.findUnique({
      where: { slug: p.category },
    });
    if (!category) throw new Error(`Missing category ${p.category}`);

    const data = {
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      currency: p.currency,
      categoryId: category.id,
      metal: p.metal,
      gemstone: p.gemstone,
      purity: p.purity,
      weightGrams: p.weightGrams,
      images: p.images,
      rating: p.rating,
      reviewCount: p.reviewCount,
      stock: p.stock,
      isNew: Boolean(p.isNew),
      isBestSeller: Boolean(p.isBestSeller),
      tags: p.tags,
      createdAt: new Date(p.createdAt),
      collections: {
        connect: p.collectionSlugs.map((slug) => ({ slug })),
      },
    };

    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        ...data,
        collections: { set: p.collectionSlugs.map((slug) => ({ slug })) },
      },
      create: { id: p.id, ...data },
    });

    // Replace variants for this product.
    await prisma.productVariant.deleteMany({ where: { productId: p.id } });
    if (p.variants.length) {
      await prisma.productVariant.createMany({
        data: p.variants.map((v) => ({
          id: v.id,
          productId: p.id,
          label: v.label,
          value: v.value,
          priceDelta: v.priceDelta,
          stock: v.stock,
        })),
      });
    }
  }

  console.log("→ Seeding reviews…");
  for (const r of REVIEWS) {
    await prisma.review.upsert({
      where: { id: r.id },
      update: {
        author: r.author,
        rating: r.rating,
        title: r.title,
        body: r.body,
        verified: r.verified,
        approved: true,
      },
      create: {
        id: r.id,
        productId: r.productId,
        author: r.author,
        rating: r.rating,
        title: r.title,
        body: r.body,
        verified: r.verified,
        approved: true,
      },
    });
  }

  console.log("→ Seeding coupons…");
  for (const c of COUPONS) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {
        description: c.description,
        type: c.type,
        value: c.value,
        minSubtotal: c.minSubtotal ?? null,
        active: c.active,
        expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
      },
      create: {
        code: c.code,
        description: c.description,
        type: c.type,
        value: c.value,
        minSubtotal: c.minSubtotal ?? null,
        active: c.active,
        expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
      },
    });
  }

  console.log("✔ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
