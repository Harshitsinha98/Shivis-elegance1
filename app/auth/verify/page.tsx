import { Suspense } from "react";
import { EmailLinkVerify } from "./verify-client";

export const metadata = { title: "Signing you in…" };

export default function VerifyPage() {
  return (
    <Suspense>
      <EmailLinkVerify />
    </Suspense>
  );
}
