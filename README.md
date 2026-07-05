# Shivis Elegance ✦

A luxury fine-jewellery brand storefront built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **Zustand**, **Framer Motion** and **Prisma**.

The project is designed to **run out of the box with zero external keys** — every product, collection and order is served from local mock data (`lib/mock-data.ts`). Payment, shipping, storage and auth integrations are wired in but degrade gracefully until you add credentials to `.env`.

## Quick start

```bash
npm install
cp .env.example .env      # optional — app runs without it
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

```
app/
  (public)/      # storefront — home, shop, collections, product, about, etc.
  (admin)/admin/ # admin dashboard — products, orders, analytics, coupons…
  (customer)/    # signed-in customer area — dashboard, orders, wishlist…
  api/           # route handlers — products, orders, search, payments, webhooks
components/
  ui/            # design-system primitives (button, input, card, dialog…)
  layout/        # navbar, footer, cart drawer, mobile nav
  home/          # landing-page sections
  product/       # grid, card, gallery, filters, details, reviews
  cart/          # cart item, summary, checkout form
  admin/         # data table, product form, charts, order timeline
  shared/        # magnetic button, scroll reveal, page transition, loader
lib/             # utils, constants, mock data, integrations, db
store/           # zustand stores (cart, wishlist, ui)
hooks/           # useCart, useWishlist, useScroll, useProductFilters
types/           # shared TypeScript types
prisma/          # database schema
```

## Design system

The palette and typography live in `app/globals.css` (Tailwind v4 `@theme`):
champagne gold `#C9A96E` on warm ivory `#FAFAF7`, with Cormorant Garamond for
display headings and Inter for body copy.

## Adding real services

Fill the matching block in `.env` and the corresponding `lib/` module lights up:
Stripe & Razorpay (payments), Shiprocket (shipping), Cloudinary (media) and
Clerk (auth). Set `DATABASE_URL` then run `npm run prisma:push` to move from
mock data to a real database.
