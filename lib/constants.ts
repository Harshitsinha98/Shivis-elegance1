import type { CategorySlug } from "@/types/product";

export const SITE = {
  name: "Shivis Elegance",
  tagline: "Timeless fine jewellery, crafted for a lifetime",
  description:
    "Ethically sourced diamonds and 18K gold, handcrafted into heirloom pieces. Discover rings, necklaces, earrings and more.",
  email: "concierge@shiviselegance.com",
  phone: "+91 98765 43210",
  address: "The Atelier, 12 Marine Drive, Mumbai 400020, India",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  social: {
    instagram: "https://instagram.com",
    pinterest: "https://pinterest.com",
    facebook: "https://facebook.com",
  },
};

export const CURRENCY: "INR" | "USD" = "INR";

/** Free shipping threshold in paise. */
export const FREE_SHIPPING_THRESHOLD = 500000; // ₹5,000
export const FLAT_SHIPPING_FEE = 15000; // ₹150
export const TAX_RATE = 0.03; // 3% GST on jewellery (illustrative)

export const NAV_LINKS = [
  { label: "Shop All", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Best Sellers", href: "/best-sellers" },
  { label: "Offers", href: "/offers" },
  { label: "About", href: "/about" },
];

export const FOOTER_LINKS = {
  Shop: [
    { label: "All Jewellery", href: "/shop" },
    { label: "Collections", href: "/collections" },
    { label: "New Arrivals", href: "/new-arrivals" },
    { label: "Best Sellers", href: "/best-sellers" },
    { label: "Offers", href: "/offers" },
  ],
  Company: [
    { label: "Our Story", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "FAQ", href: "/faq" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export const CATEGORIES: { slug: CategorySlug; name: string }[] = [
  { slug: "rings", name: "Rings" },
  { slug: "necklaces", name: "Necklaces" },
  { slug: "earrings", name: "Earrings" },
  { slug: "bracelets", name: "Bracelets" },
  { slug: "bangles", name: "Bangles" },
  { slug: "pendants", name: "Pendants" },
];

export const METALS = [
  { value: "yellow-gold", label: "Yellow Gold" },
  { value: "white-gold", label: "White Gold" },
  { value: "rose-gold", label: "Rose Gold" },
  { value: "platinum", label: "Platinum" },
  { value: "sterling-silver", label: "Sterling Silver" },
];

export const GEMSTONES = [
  { value: "diamond", label: "Diamond" },
  { value: "emerald", label: "Emerald" },
  { value: "ruby", label: "Ruby" },
  { value: "sapphire", label: "Sapphire" },
  { value: "pearl", label: "Pearl" },
  { value: "none", label: "No Stone" },
];

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

export const TRUST_BADGES = [
  { title: "Certified Authenticity", desc: "BIS hallmarked & GIA certified" },
  { title: "Lifetime Warranty", desc: "Free servicing, forever" },
  { title: "Free Insured Shipping", desc: "On orders over ₹5,000" },
  { title: "30-Day Returns", desc: "Easy, no-questions returns" },
];

export const CRAFTSMANSHIP_POINTS = [
  {
    title: "Handcrafted by master artisans",
    desc: "Every piece is shaped, set and polished by hand in our Mumbai atelier — not stamped out on a line.",
  },
  {
    title: "Certified & conflict-free",
    desc: "Every diamond ships with a GIA or IGI certificate and is sourced under the Kimberley Process.",
  },
  {
    title: "Built to become an heirloom",
    desc: "18K/22K gold and rhodium-finished settings, engineered to outlast trends and generations.",
  },
  {
    title: "Complimentary lifetime care",
    desc: "Free resizing, cleaning and re-polishing for as long as you own the piece.",
  },
];

/** Placeholder press mentions — swap for real logos/links when available. */
export const PRESS_MENTIONS = [
  "Vogue",
  "Harper's Bazaar",
  "GQ",
  "Elle",
  "Architectural Digest",
];
