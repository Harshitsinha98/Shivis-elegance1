import { listCoupons } from "@/lib/db/repo";
import { CouponsManager } from "./coupons-manager";

export const metadata = { title: "Coupons · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await listCoupons();
  return <CouponsManager coupons={coupons} />;
}
