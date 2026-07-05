import type {
  Product,
  Collection,
  Category,
  Review,
  CategorySlug,
} from "@/types/product";
import type { Order, Coupon } from "@/types/order";
import type { ProductQuery } from "@/types/api";

// Curated Unsplash jewellery imagery (royalty-free) used as placeholders.
const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const RING_SIZES = ["6", "7", "8", "9", "10"];
const CHAIN_LENGTHS = ['16"', '18"', '20"'];

function sizeVariants(prefix: string, sizes: string[], stock = 8) {
  return sizes.map((s, i) => ({
    id: `${prefix}-v${i}`,
    label: prefix.includes("ring") ? "Size" : "Length",
    value: s,
    priceDelta: 0,
    stock,
  }));
}

export const CATEGORY_DATA: Category[] = [
  {
    slug: "rings",
    name: "Rings",
    description: "Solitaires, eternity bands and statement cocktail rings.",
    image: IMG("photo-1605100804763-247f67b3557e"),
  },
  {
    slug: "necklaces",
    name: "Necklaces",
    description: "Delicate chains to bold diamond rivières.",
    image: IMG("photo-1599643478518-a784e5dc4c8f"),
  },
  {
    slug: "earrings",
    name: "Earrings",
    description: "From everyday studs to chandelier drops.",
    image: IMG("photo-1535632066927-ab7c9ab60908"),
  },
  {
    slug: "bracelets",
    name: "Bracelets",
    description: "Tennis bracelets and sculptural cuffs.",
    image: IMG("photo-1611591437281-460bfbe1220a"),
  },
  {
    slug: "bangles",
    name: "Bangles",
    description: "Handcrafted gold bangles, stacked or solo.",
    image: IMG("photo-1515562141207-7a88fb7ce338"),
  },
  {
    slug: "pendants",
    name: "Pendants",
    description: "Meaningful motifs on fine gold chains.",
    image: IMG("photo-1602751584552-8ba73aad10e1"),
  },
];

export const PRODUCTS: Product[] = [
  {
    id: "p1",
    slug: "aurelia-solitaire-ring",
    name: "Aurélia Solitaire Ring",
    tagline: "A brilliant-cut diamond on a whisper-thin band",
    description:
      "The Aurélia is our purest expression of the solitaire — a 1.0ct brilliant-cut diamond raised on four hand-polished prongs above a 1.8mm 18K gold band. GIA certified, ethically sourced, and finished by a single master jeweller.",
    price: 24500000,
    compareAtPrice: 28000000,
    currency: "INR",
    category: "rings",
    collectionSlugs: ["bridal", "signature"],
    metal: "white-gold",
    gemstone: "diamond",
    purity: "18K",
    weightGrams: 3.2,
    images: [
      IMG("photo-1605100804763-247f67b3557e"),
      IMG("photo-1603561591411-07134e71a2a9"),
      IMG("photo-1608042314453-ae338d80c427"),
    ],
    variants: sizeVariants("ring-p1", RING_SIZES),
    rating: 4.9,
    reviewCount: 128,
    stock: 12,
    isBestSeller: true,
    tags: ["engagement", "diamond", "solitaire"],
    createdAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "p2",
    slug: "seraphine-diamond-rivere",
    name: "Séraphine Diamond Rivière",
    tagline: "Fifty-two graduated diamonds in a seamless line",
    description:
      "A red-carpet rivière necklace set with 52 graduated brilliant diamonds totalling 8.4ct, each individually claw-set in 18K white gold for maximum light return.",
    price: 89500000,
    currency: "INR",
    category: "necklaces",
    collectionSlugs: ["signature", "haute"],
    metal: "white-gold",
    gemstone: "diamond",
    purity: "18K",
    weightGrams: 18.6,
    images: [
      IMG("photo-1599643478518-a784e5dc4c8f"),
      IMG("photo-1611652022419-a9419f74343d"),
    ],
    variants: sizeVariants("chain-p2", CHAIN_LENGTHS, 3),
    rating: 5,
    reviewCount: 41,
    stock: 4,
    isBestSeller: true,
    tags: ["diamond", "statement", "bridal"],
    createdAt: "2026-02-02T00:00:00.000Z",
  },
  {
    id: "p3",
    slug: "lumiere-emerald-studs",
    name: "Lumière Emerald Studs",
    tagline: "Colombian emeralds haloed in diamonds",
    description:
      "A pair of vivid Colombian emeralds (1.6ct total) framed by a halo of pavé diamonds, set in 18K yellow gold with secure screw backs.",
    price: 15800000,
    compareAtPrice: 17500000,
    currency: "INR",
    category: "earrings",
    collectionSlugs: ["colour", "signature"],
    metal: "yellow-gold",
    gemstone: "emerald",
    purity: "18K",
    weightGrams: 4.1,
    images: [
      IMG("photo-1535632066927-ab7c9ab60908"),
      IMG("photo-1630019852942-f89202989a59"),
    ],
    variants: [],
    rating: 4.8,
    reviewCount: 76,
    stock: 18,
    isNew: true,
    tags: ["emerald", "studs", "colour"],
    createdAt: "2026-06-18T00:00:00.000Z",
  },
  {
    id: "p4",
    slug: "celeste-tennis-bracelet",
    name: "Céleste Tennis Bracelet",
    tagline: "A continuous river of round diamonds",
    description:
      "Forty-four round brilliant diamonds (5.0ct total) set in a flexible 18K white gold line with a concealed double-locking clasp.",
    price: 62000000,
    currency: "INR",
    category: "bracelets",
    collectionSlugs: ["signature", "haute"],
    metal: "white-gold",
    gemstone: "diamond",
    purity: "18K",
    weightGrams: 11.3,
    images: [
      IMG("photo-1611591437281-460bfbe1220a"),
      IMG("photo-1602173574767-37ac01994b2a"),
    ],
    variants: [],
    rating: 4.9,
    reviewCount: 54,
    stock: 7,
    isBestSeller: true,
    tags: ["diamond", "tennis", "classic"],
    createdAt: "2026-03-21T00:00:00.000Z",
  },
  {
    id: "p5",
    slug: "rosa-eternity-band",
    name: "Rosa Eternity Band",
    tagline: "Full circle of rose-gold set diamonds",
    description:
      "A full eternity band channel-set with 1.5ct of round diamonds in warm 18K rose gold — a modern symbol of forever.",
    price: 18900000,
    currency: "INR",
    category: "rings",
    collectionSlugs: ["bridal"],
    metal: "rose-gold",
    gemstone: "diamond",
    purity: "18K",
    weightGrams: 2.9,
    images: [
      IMG("photo-1603974372039-adc49044b6bd"),
      IMG("photo-1596944924616-7b38e7cfac36"),
    ],
    variants: sizeVariants("ring-p5", RING_SIZES),
    rating: 4.7,
    reviewCount: 92,
    stock: 15,
    isNew: true,
    tags: ["eternity", "rose-gold", "bridal"],
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "p6",
    slug: "azure-sapphire-pendant",
    name: "Azure Sapphire Pendant",
    tagline: "A Ceylon sapphire drop on a fine gold chain",
    description:
      "A 2.2ct oval Ceylon sapphire suspended from an 18K white gold chain, encircled by a delicate diamond halo.",
    price: 21500000,
    currency: "INR",
    category: "pendants",
    collectionSlugs: ["colour"],
    metal: "white-gold",
    gemstone: "sapphire",
    purity: "18K",
    weightGrams: 3.6,
    images: [
      IMG("photo-1602751584552-8ba73aad10e1"),
      IMG("photo-1591209627776-b1a1b1a1b1a1"),
    ],
    variants: sizeVariants("chain-p6", CHAIN_LENGTHS),
    rating: 4.8,
    reviewCount: 63,
    stock: 10,
    tags: ["sapphire", "pendant", "colour"],
    createdAt: "2026-05-11T00:00:00.000Z",
  },
  {
    id: "p7",
    slug: "vivienne-pearl-drops",
    name: "Vivienne Pearl Drops",
    tagline: "South-Sea pearls beneath diamond bows",
    description:
      "Lustrous 9mm South-Sea pearls swing from diamond-set bows in 18K yellow gold — timeless drop earrings for any occasion.",
    price: 12400000,
    compareAtPrice: 14000000,
    currency: "INR",
    category: "earrings",
    collectionSlugs: ["signature"],
    metal: "yellow-gold",
    gemstone: "pearl",
    purity: "18K",
    weightGrams: 5.2,
    images: [
      IMG("photo-1589128777073-263566ae5e4d"),
      IMG("photo-1571908599407-cff0da3d3ff9"),
    ],
    variants: [],
    rating: 4.6,
    reviewCount: 47,
    stock: 22,
    tags: ["pearl", "drops", "classic"],
    createdAt: "2026-04-08T00:00:00.000Z",
  },
  {
    id: "p8",
    slug: "maharani-gold-bangle",
    name: "Maharani Gold Bangle",
    tagline: "Hand-engraved 22K heritage bangle",
    description:
      "A substantial 22K yellow gold bangle, hand-engraved with a traditional paisley motif by our Jaipur artisans — heritage craft for the modern wardrobe.",
    price: 34500000,
    currency: "INR",
    category: "bangles",
    collectionSlugs: ["heritage"],
    metal: "yellow-gold",
    gemstone: "none",
    purity: "22K",
    weightGrams: 21.4,
    images: [
      IMG("photo-1515562141207-7a88fb7ce338"),
      IMG("photo-1610694955371-d4a3e0ce4b52"),
    ],
    variants: sizeVariants("bangle-p8", ["2.4", "2.6", "2.8"]),
    rating: 4.9,
    reviewCount: 38,
    stock: 6,
    isBestSeller: true,
    tags: ["gold", "heritage", "bangle"],
    createdAt: "2026-02-27T00:00:00.000Z",
  },
  {
    id: "p9",
    slug: "ruby-heart-pendant",
    name: "Ruby Heart Pendant",
    tagline: "A Burmese ruby heart on rose gold",
    description:
      "A 1.4ct heart-shaped Burmese ruby in 18K rose gold, framed with pavé diamonds — a romantic gift that lasts.",
    price: 16900000,
    currency: "INR",
    category: "pendants",
    collectionSlugs: ["colour", "bridal"],
    metal: "rose-gold",
    gemstone: "ruby",
    purity: "18K",
    weightGrams: 3.1,
    images: [
      IMG("photo-1608042314453-ae338d80c427"),
      IMG("photo-1611085583191-a3b181a88401"),
    ],
    variants: sizeVariants("chain-p9", CHAIN_LENGTHS),
    rating: 4.7,
    reviewCount: 58,
    stock: 14,
    isNew: true,
    tags: ["ruby", "heart", "gift"],
    createdAt: "2026-06-25T00:00:00.000Z",
  },
  {
    id: "p10",
    slug: "orion-diamond-studs",
    name: "Orion Diamond Studs",
    tagline: "The everyday 1ct-total brilliant studs",
    description:
      "A matched pair of round brilliant diamonds (1.0ct total) in classic four-prong 18K white gold martini settings — the studs you never take off.",
    price: 19900000,
    currency: "INR",
    category: "earrings",
    collectionSlugs: ["signature", "essentials"],
    metal: "white-gold",
    gemstone: "diamond",
    purity: "18K",
    weightGrams: 2.0,
    images: [
      IMG("photo-1630019852942-f89202989a59"),
      IMG("photo-1535632066927-ab7c9ab60908"),
    ],
    variants: [],
    rating: 4.9,
    reviewCount: 211,
    stock: 30,
    isBestSeller: true,
    tags: ["diamond", "studs", "essentials"],
    createdAt: "2026-01-30T00:00:00.000Z",
  },
  {
    id: "p11",
    slug: "estelle-layered-necklace",
    name: "Estelle Layered Necklace",
    tagline: "Three fine chains, one effortless layer",
    description:
      "A pre-layered trio of 18K yellow gold chains at graduated lengths, finished with a tiny bezel-set diamond — modern layering, no tangles.",
    price: 9800000,
    compareAtPrice: 11500000,
    currency: "INR",
    category: "necklaces",
    collectionSlugs: ["essentials"],
    metal: "yellow-gold",
    gemstone: "diamond",
    purity: "18K",
    weightGrams: 6.4,
    images: [
      IMG("photo-1611652022419-a9419f74343d"),
      IMG("photo-1599643478518-a784e5dc4c8f"),
    ],
    variants: [],
    rating: 4.6,
    reviewCount: 84,
    stock: 25,
    isNew: true,
    tags: ["layered", "everyday", "gold"],
    createdAt: "2026-06-12T00:00:00.000Z",
  },
  {
    id: "p12",
    slug: "atlas-signet-ring",
    name: "Atlas Signet Ring",
    tagline: "A modern signet in solid gold",
    description:
      "A contemporary take on the signet — solid 18K yellow gold with a brushed oval face ready for engraving. Unisex, substantial, timeless.",
    price: 13200000,
    currency: "INR",
    category: "rings",
    collectionSlugs: ["essentials", "heritage"],
    metal: "yellow-gold",
    gemstone: "none",
    purity: "18K",
    weightGrams: 8.7,
    images: [
      IMG("photo-1596944924616-7b38e7cfac36"),
      IMG("photo-1603561591411-07134e71a2a9"),
    ],
    variants: sizeVariants("ring-p12", RING_SIZES),
    rating: 4.5,
    reviewCount: 33,
    stock: 16,
    tags: ["signet", "gold", "unisex"],
    createdAt: "2026-05-29T00:00:00.000Z",
  },
];

export const COLLECTIONS: Collection[] = [
  {
    slug: "signature",
    name: "The Signature Collection",
    description:
      "Our defining pieces — the diamonds and designs that made Shivis Elegance.",
    heroImage: IMG("photo-1515562141207-7a88fb7ce338"),
    productSlugs: [
      "aurelia-solitaire-ring",
      "seraphine-diamond-rivere",
      "celeste-tennis-bracelet",
      "orion-diamond-studs",
    ],
    featured: true,
  },
  {
    slug: "bridal",
    name: "Bridal & Engagement",
    description: "For the moment, and every anniversary after it.",
    heroImage: IMG("photo-1605100804763-247f67b3557e"),
    productSlugs: [
      "aurelia-solitaire-ring",
      "rosa-eternity-band",
      "ruby-heart-pendant",
    ],
    featured: true,
  },
  {
    slug: "colour",
    name: "Coloured Gemstones",
    description: "Emerald, sapphire and ruby — jewellery with a heartbeat.",
    heroImage: IMG("photo-1602751584552-8ba73aad10e1"),
    productSlugs: [
      "lumiere-emerald-studs",
      "azure-sapphire-pendant",
      "ruby-heart-pendant",
    ],
    featured: true,
  },
  {
    slug: "heritage",
    name: "Heritage Craft",
    description: "Hand-engraved gold, honouring Indian artisanal tradition.",
    heroImage: IMG("photo-1610694955371-d4a3e0ce4b52"),
    productSlugs: ["maharani-gold-bangle", "atlas-signet-ring"],
  },
  {
    slug: "essentials",
    name: "Everyday Essentials",
    description: "The fine pieces you reach for every single day.",
    heroImage: IMG("photo-1611652022419-a9419f74343d"),
    productSlugs: [
      "orion-diamond-studs",
      "estelle-layered-necklace",
      "atlas-signet-ring",
    ],
  },
  {
    slug: "haute",
    name: "Haute Joaillerie",
    description: "One-of-a-kind high jewellery, by appointment.",
    heroImage: IMG("photo-1599643478518-a784e5dc4c8f"),
    productSlugs: ["seraphine-diamond-rivere", "celeste-tennis-bracelet"],
  },
];

export const REVIEWS: Review[] = [
  {
    id: "r1",
    productId: "p1",
    author: "Ananya M.",
    rating: 5,
    title: "Beyond my expectations",
    body: "The sparkle is unreal in person. My fiancé said the packaging alone made the proposal feel special.",
    createdAt: "2026-05-20T00:00:00.000Z",
    verified: true,
  },
  {
    id: "r2",
    productId: "p1",
    author: "Rohan K.",
    rating: 5,
    title: "Worth every rupee",
    body: "GIA certificate included, flawless setting. Concierge helped me pick the size perfectly.",
    createdAt: "2026-04-14T00:00:00.000Z",
    verified: true,
  },
  {
    id: "r3",
    productId: "p10",
    author: "Priya S.",
    rating: 5,
    title: "My daily diamonds",
    body: "Haven't taken them off in weeks. Just the right size — elegant, not flashy.",
    createdAt: "2026-06-02T00:00:00.000Z",
    verified: true,
  },
  {
    id: "r4",
    productId: "p8",
    author: "Meera D.",
    rating: 4,
    title: "Stunning craftsmanship",
    body: "The engraving is exquisite. Slightly heavier than I expected but I love it.",
    createdAt: "2026-03-30T00:00:00.000Z",
    verified: true,
  },
];

export interface Testimonial {
  quote: string;
  author: string;
  location: string;
  rating: number;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "The craftsmanship is extraordinary. My solitaire catches the light like nothing I've ever owned — and the concierge made choosing it effortless.",
    author: "Ananya Mehta",
    location: "Mumbai",
    rating: 5,
  },
  {
    quote:
      "I've bought from the big houses. Shivis Elegance matches them on quality and beats them on service. The bangle is a family heirloom now.",
    author: "Rajesh Iyer",
    location: "Bengaluru",
    rating: 5,
  },
  {
    quote:
      "From the packaging to the certificate, every detail feels considered. These are the diamond studs I'll wear for the rest of my life.",
    author: "Priya Sharma",
    location: "Delhi",
    rating: 5,
  },
];

export interface SocialPost {
  id: string;
  image: string;
  handle: string;
}

/** Curated lifestyle shots for the homepage social-proof gallery — distinct
 * from product photography so it reads as customer/community content. */
export const SOCIAL_GALLERY: SocialPost[] = [
  { id: "s1", image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=600&q=80", handle: "@ananya.wears.gold" },
  { id: "s2", image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=600&q=80", handle: "@thebridediaries" },
  { id: "s3", image: "https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&w=600&q=80", handle: "@meera.styles" },
  { id: "s4", image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=600&q=80", handle: "@priya.everyday" },
  { id: "s5", image: "https://images.unsplash.com/photo-1602751584547-6d67e5f92a1c?auto=format&fit=crop&w=600&q=80", handle: "@rohan.gifts" },
  { id: "s6", image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=600&q=80", handle: "@shivis.elegance.fan" },
];

export const COUPONS: Coupon[] = [
  {
    code: "WELCOME10",
    description: "10% off your first order",
    type: "percentage",
    value: 10,
    active: true,
  },
  {
    code: "LUXE500",
    description: "₹500 off orders over ₹10,000",
    type: "fixed",
    value: 50000,
    minSubtotal: 1000000,
    active: true,
  },
  {
    code: "BRIDAL15",
    description: "15% off the Bridal collection",
    type: "percentage",
    value: 15,
    active: true,
    expiresAt: "2026-12-31T00:00:00.000Z",
  },
];

export const SAMPLE_ORDERS: Order[] = [
  {
    id: "o1",
    number: "LJ-100238",
    items: [
      {
        productId: "p10",
        slug: "orion-diamond-studs",
        name: "Orion Diamond Studs",
        image: PRODUCTS[9].images[0],
        unitPrice: 19900000,
        quantity: 1,
      },
    ],
    subtotal: 19900000,
    shipping: 0,
    discount: 0,
    tax: 597000,
    total: 20497000,
    currency: "INR",
    status: "shipped",
    paymentStatus: "paid",
    paymentProvider: "razorpay",
    shippingAddress: {
      id: "a1",
      label: "Home",
      fullName: "Ananya Mehta",
      phone: "+91 98200 11223",
      line1: "402, Sea Breeze Apartments",
      line2: "Nepean Sea Road",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400006",
      country: "India",
      isDefault: true,
    },
    trackingNumber: "SR123456789IN",
    timeline: [
      { status: "confirmed", label: "Order confirmed", at: "2026-06-28T09:12:00.000Z", done: true },
      { status: "processing", label: "Being crafted & packed", at: "2026-06-29T11:00:00.000Z", done: true },
      { status: "shipped", label: "Shipped via Shiprocket", at: "2026-06-30T16:30:00.000Z", done: true },
      { status: "delivered", label: "Out for delivery", at: "", done: false },
    ],
    createdAt: "2026-06-28T09:12:00.000Z",
  },
  {
    id: "o2",
    number: "LJ-100211",
    items: [
      {
        productId: "p5",
        slug: "rosa-eternity-band",
        name: "Rosa Eternity Band",
        image: PRODUCTS[4].images[0],
        variantLabel: "Size 7",
        unitPrice: 18900000,
        quantity: 1,
      },
    ],
    subtotal: 18900000,
    shipping: 0,
    discount: 1890000,
    tax: 510300,
    total: 17520300,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentProvider: "stripe",
    shippingAddress: {
      id: "a1",
      label: "Home",
      fullName: "Ananya Mehta",
      phone: "+91 98200 11223",
      line1: "402, Sea Breeze Apartments",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400006",
      country: "India",
      isDefault: true,
    },
    trackingNumber: "SR987654321IN",
    timeline: [
      { status: "confirmed", label: "Order confirmed", at: "2026-05-02T10:00:00.000Z", done: true },
      { status: "processing", label: "Being crafted & packed", at: "2026-05-03T10:00:00.000Z", done: true },
      { status: "shipped", label: "Shipped via Shiprocket", at: "2026-05-04T10:00:00.000Z", done: true },
      { status: "delivered", label: "Delivered", at: "2026-05-06T14:20:00.000Z", done: true },
    ],
    createdAt: "2026-05-02T10:00:00.000Z",
  },
];

// ─────────────────────── Query helpers ───────────────────────

export function getProductBySlug(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getCollectionBySlug(slug: string) {
  return COLLECTIONS.find((c) => c.slug === slug);
}

export function getProductsByCollection(slug: string) {
  const col = getCollectionBySlug(slug);
  if (!col) return [];
  return col.productSlugs
    .map((s) => getProductBySlug(s))
    .filter((p): p is Product => Boolean(p));
}

export function getProductsByCategory(category: CategorySlug) {
  return PRODUCTS.filter((p) => p.category === category);
}

export function getReviewsForProduct(productId: string) {
  return REVIEWS.filter((r) => r.productId === productId);
}

export function getRelatedProducts(product: Product, limit = 4) {
  return PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category
  )
    .concat(
      PRODUCTS.filter(
        (p) =>
          p.id !== product.id &&
          p.category !== product.category &&
          p.collectionSlugs.some((c) => product.collectionSlugs.includes(c))
      )
    )
    .slice(0, limit);
}

export const NEW_ARRIVALS = PRODUCTS.filter((p) => p.isNew);
export const BEST_SELLERS = PRODUCTS.filter((p) => p.isBestSeller);
export const FEATURED_COLLECTIONS = COLLECTIONS.filter((c) => c.featured);

/** Filter + sort + paginate over the mock catalogue. */
export function queryProducts(q: ProductQuery = {}) {
  let items = [...PRODUCTS];

  if (q.category) items = items.filter((p) => p.category === q.category);
  if (q.collection)
    items = items.filter((p) => p.collectionSlugs.includes(q.collection!));
  if (q.metal) items = items.filter((p) => p.metal === q.metal);
  if (q.gemstone) items = items.filter((p) => p.gemstone === q.gemstone);
  if (typeof q.minPrice === "number")
    items = items.filter((p) => p.price >= q.minPrice!);
  if (typeof q.maxPrice === "number")
    items = items.filter((p) => p.price <= q.maxPrice!);
  if (q.q) {
    const term = q.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.tagline.toLowerCase().includes(term) ||
        p.tags.some((t) => t.includes(term))
    );
  }

  switch (q.sort) {
    case "newest":
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "price-asc":
      items.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      items.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      items.sort((a, b) => b.rating - a.rating);
      break;
    default:
      items.sort(
        (a, b) => Number(!!b.isBestSeller) - Number(!!a.isBestSeller)
      );
  }

  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 12;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return {
    items: paged,
    total: items.length,
    page,
    pageSize,
    hasMore: start + pageSize < items.length,
  };
}
