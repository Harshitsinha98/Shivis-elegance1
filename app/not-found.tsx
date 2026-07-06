import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ background: "#FAFAF7", color: "#1A1814", fontFamily: "Inter, sans-serif" }}>
        <div className="grid min-h-screen place-items-center px-6 text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-champagne-dark">Error 404</p>
            <h1 className="mt-4 font-display text-6xl text-obsidian">Page not found</h1>
            <p className="mt-4 text-warm-gray">
              The page you're looking for has moved or no longer exists.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex rounded-full bg-champagne px-8 py-3 text-sm font-medium uppercase tracking-[0.12em] text-pearl transition hover:bg-champagne-dark hover:text-pearl"
            >
              Return home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
