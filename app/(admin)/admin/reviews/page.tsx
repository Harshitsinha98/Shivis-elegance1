import { listReviews, listAllProducts } from "@/lib/db/repo";
import { ReviewsList, type AdminReview } from "./reviews-list";

export const metadata = { title: "Reviews · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const [reviews, products] = await Promise.all([listReviews(), listAllProducts()]);
  const byId = new Map(products.map((p) => [p.id, p]));

  const rows: AdminReview[] = reviews.map((r) => {
    const p = byId.get(r.productId);
    return {
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      author: r.author,
      createdAt: r.createdAt,
      verified: r.verified,
      approved: r.approved,
      productName: p?.name,
      productImage: p?.images[0],
    };
  });

  const pending = rows.filter((r) => !r.approved).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-obsidian">Reviews</h1>
        <p className="text-warm-gray">
          Moderate customer reviews{pending > 0 ? ` · ${pending} pending approval` : ""}
        </p>
      </div>
      <ReviewsList reviews={rows} />
    </div>
  );
}
