import { NextResponse } from "next/server";
import crypto from "crypto";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, error, code }, { status });
}

/**
 * Generate an order/receipt number. Mixes in Date.now() + a random component
 * so two calls with the same seed (e.g. the same cart contents submitted
 * twice — a retried payment, a repeat order, a double-click) never collide.
 * A seed-only hash was deterministic and caused "Unique constraint failed on
 * (number)" whenever the same items+name were ordered more than once.
 */
export function orderNumber(seed: string) {
  let hash = 0;
  const salted = `${seed}:${Date.now()}:${crypto.randomInt(0, 1_000_000)}`;
  for (let i = 0; i < salted.length; i++) {
    hash = (hash * 31 + salted.charCodeAt(i)) >>> 0;
  }
  return `LJ-${(100000 + (hash % 899999)).toString()}`;
}
