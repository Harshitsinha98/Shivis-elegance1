"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <div className="border-b border-ivory/10">
      <div className="container-luxe grid gap-8 py-16 md:grid-cols-2 md:items-center">
        <div>
          <h3 className="font-display text-3xl md:text-4xl">Join the Shivis Elegance list</h3>
          <p className="mt-3 max-w-md text-sm text-ivory/60">
            Be first to see new arrivals, private-sale previews and styling notes
            from our master jewellers. ₹1,000 off your first order.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email) setDone(true);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          {done ? (
            <p className="flex items-center gap-2 text-champagne">
              <Check size={18} /> You're on the list. Welcome to Shivis Elegance.
            </p>
          ) : (
            <>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 rounded-full border border-ivory/20 bg-transparent px-6 py-3 text-sm text-ivory placeholder:text-ivory/40 focus:border-champagne focus:outline-none"
              />
              <Button type="submit">Subscribe</Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
