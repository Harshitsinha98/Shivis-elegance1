#!/usr/bin/env bash
# Push every var from .env.local into the linked Vercel project (all 3 targets).
# Usage:  bash scripts/vercel-env-push.sh
# Requires: `vercel login` + `vercel link` already done.
# Re-runnable: removes an existing var before re-adding so values stay in sync.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=".env.local"
TARGETS=(production preview development)

# NEXT_PUBLIC_SITE_URL is set separately to the real prod domain, so skip it here.
SKIP_KEYS=("NEXT_PUBLIC_SITE_URL")

is_skipped() { local k="$1"; for s in "${SKIP_KEYS[@]}"; do [[ "$k" == "$s" ]] && return 0; done; return 1; }

while IFS= read -r line || [[ -n "$line" ]]; do
  # strip comments / blanks
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line//[[:space:]]/}" ]] && continue
  [[ "$line" != *"="* ]] && continue

  key="${line%%=*}"
  key="${key//[[:space:]]/}"
  val="${line#*=}"
  # strip surrounding quotes
  val="${val%\"}"; val="${val#\"}"

  is_skipped "$key" && { echo "· skip  $key"; continue; }
  [[ -z "$val" ]] && { echo "· empty $key (skipped)"; continue; }

  for t in "${TARGETS[@]}"; do
    vercel env rm "$key" "$t" --yes >/dev/null 2>&1 || true
    printf '%s' "$val" | vercel env add "$key" "$t" >/dev/null 2>&1
  done
  echo "✓ set   $key  → ${TARGETS[*]}"
done < "$ENV_FILE"

echo "Done. Remember to set NEXT_PUBLIC_SITE_URL to the prod domain separately."
