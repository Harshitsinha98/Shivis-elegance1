/**
 * Prisma client singleton.
 *
 * Returns `null` when the database is not configured (no DATABASE_URL) or the
 * client has not been generated yet. Callers should fall back to mock data so
 * the app runs with zero setup. Run `npm run prisma:generate && npm run
 * prisma:push` to enable the real database.
 */
import type { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null | undefined;
};

function createClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;
  try {
    // Lazy require so a missing/ungenerated client never crashes the build.
    const { PrismaClient: Client } =
      require("@prisma/client") as typeof import("@prisma/client");

    // Neon serverless driver adapter. Routes queries through Neon's WebSocket
    // pool instead of Prisma's native TCP pool, so idle connections dropped by
    // Neon's compute auto-suspend reconnect transparently — no more noisy
    // `Error in PostgreSQL connection: kind: Closed` on the next query.
    const { PrismaNeon } =
      require("@prisma/adapter-neon") as typeof import("@prisma/adapter-neon");
    const { neonConfig } =
      require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
    // Node has no global WebSocket; give the driver one for the WS transport.
    if (!neonConfig.webSocketConstructor) {
      neonConfig.webSocketConstructor = require("ws");
    }
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

    return new Client({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  } catch {
    return null;
  }
}

export const prisma: PrismaClient | null =
  globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const isDbEnabled = () => prisma !== null;
