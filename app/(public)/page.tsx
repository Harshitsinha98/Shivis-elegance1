import { HeroSection } from "@/components/home/hero-section";
import { BrandTrust } from "@/components/home/brand-trust";
import { PressStrip } from "@/components/home/press-strip";
import { CategoryShowcase } from "@/components/home/category-showcase";
import { NewArrivals } from "@/components/home/new-arrivals";
import { ShopByPrice } from "@/components/home/shop-by-price";
import { BestSellers } from "@/components/home/best-seller";
import { ShopByGemstone } from "@/components/home/shop-by-gemstone";
import { CategorySpotlight } from "@/components/home/category-spotlight";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { FeaturedCollection } from "@/components/home/featured-collection";
import { PromoBanner } from "@/components/home/promo-banner";
import { Testimonials } from "@/components/home/testimonials";
import { InstagramGallery } from "@/components/home/instagram-gallery";

// Product rails read live from the DB — refresh at most every minute.
export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <BrandTrust />
      <PressStrip />
      <CategoryShowcase />
      <NewArrivals />
      <ShopByPrice />
      <BestSellers />
      <CategorySpotlight
        category="rings"
        eyebrow="The engagement edit"
        title="Rings, for every promise"
      />
      <ShopByGemstone />
      <FeaturedCollection />
      <CategorySpotlight
        category="necklaces"
        eyebrow="Layer it on"
        title="Necklaces & pendants"
        tone="cream"
      />
      <PromoBanner />
      <WhyChooseUs />
      <Testimonials />
      <InstagramGallery />
    </>
  );
}
