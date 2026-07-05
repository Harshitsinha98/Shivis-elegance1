import { HeroSection } from "@/components/home/hero-section";
import { BrandTrust } from "@/components/home/brand-trust";
import { PressStrip } from "@/components/home/press-strip";
import { CategoryShowcase } from "@/components/home/category-showcase";
import { NewArrivals } from "@/components/home/new-arrivals";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { FeaturedCollection } from "@/components/home/featured-collection";
import { PromoBanner } from "@/components/home/promo-banner";
import { BestSellers } from "@/components/home/best-seller";
import { Testimonials } from "@/components/home/testimonials";
import { InstagramGallery } from "@/components/home/instagram-gallery";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <BrandTrust />
      <PressStrip />
      <CategoryShowcase />
      <NewArrivals />
      <WhyChooseUs />
      <FeaturedCollection />
      <PromoBanner />
      <BestSellers />
      <Testimonials />
      <InstagramGallery />
    </>
  );
}
