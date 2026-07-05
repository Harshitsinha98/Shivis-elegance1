import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="text-center text-warm-gray">Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}
