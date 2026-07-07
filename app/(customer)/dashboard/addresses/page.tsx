import { getCurrentUser } from "@/lib/auth/auth";
import { AddressesManager } from "@/components/account/addresses-manager";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await getCurrentUser();
  const addresses = user?.addresses ?? [];

  return <AddressesManager initialAddresses={addresses} />;
}
