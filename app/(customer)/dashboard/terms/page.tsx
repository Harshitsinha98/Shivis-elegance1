import { getCurrentUser } from "@/lib/auth/auth";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const metadata = { title: "Preferences" };
export const dynamic = "force-dynamic";

const PREFERENCES = [
  { label: "New collection previews", desc: "Be first to see new arrivals", on: true },
  { label: "Private-sale invitations", desc: "Members-only events & offers", on: true },
  { label: "Order & shipping updates", desc: "Transactional emails and SMS", on: true },
  { label: "Styling notes", desc: "Occasional editorial from our jewellers", on: false },
];

export default async function PreferencesPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-8">
      <ProfileForm
        name={user?.name ?? ""}
        email={
          user?.email && /@phone\.luxejewels$/i.test(user.email)
            ? ""
            : user?.email ?? ""
        }
        phone={user?.phone ?? ""}
      />

      <div className="rounded-2xl border border-border bg-pearl p-6">
        <h2 className="font-display text-2xl text-obsidian">Communication preferences</h2>
        <ul className="mt-5 divide-y divide-border">
          {PREFERENCES.map((p) => (
            <li key={p.label} className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-obsidian">{p.label}</p>
                <p className="text-sm text-warm-gray">{p.desc}</p>
              </div>
              <span
                className={`relative h-6 w-11 rounded-full transition ${
                  p.on ? "bg-champagne" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-pearl shadow transition ${
                    p.on ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
