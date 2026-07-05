import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SearchDialog } from "@/components/layout/search-dialog";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <MobileNav />
      <CartDrawer />
      <SearchDialog />
      {/* Offset for the fixed header (announcement + nav + links) */}
      <div className="pt-[136px] lg:pt-[164px]">{children}</div>
      <Footer />
    </>
  );
}
