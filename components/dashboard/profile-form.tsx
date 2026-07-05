"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared/loading-screen";

interface ProfileFormProps {
  name: string;
  email: string;
  phone: string;
}

/** Editable profile card — saves name + phone to the account. */
export function ProfileForm({ name, email, phone }: ProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(name);
  const [phoneVal, setPhoneVal] = useState(phone);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, phone: phoneVal }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Could not save your changes.");
        return;
      }
      setSaved(true);
      // Re-fetch server components so the new name shows across the dashboard.
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={save} className="rounded-2xl border border-border bg-pearl p-6">
      <h2 className="font-display text-2xl text-obsidian">Profile</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          name="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Input
          label="Email"
          type="email"
          value={email}
          readOnly
          className="opacity-70"
        />
        <Input
          label="Phone"
          name="phone"
          type="tel"
          value={phoneVal}
          onChange={(e) => setPhoneVal(e.target.value)}
        />
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? <Spinner /> : "Save changes"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-700">
            <Check size={15} /> Saved
          </span>
        )}
      </div>
    </form>
  );
}
