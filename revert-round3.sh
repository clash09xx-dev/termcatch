#!/usr/bin/env bash
set -e
BACKUP="$(dirname "$0")/_backup_round3"
BASE="$(dirname "$0")"
FILES=(
  "app/globals.css"
  "tailwind.config.ts"
  "components/brand/wordmark.tsx"
  "components/layout/landing-nav.tsx"
  "app/page.tsx"
  "components/layout/business-sidebar.tsx"
  "components/layout/business-topbar.tsx"
  "app/business/(business-layout)/layout.tsx"
  "app/search/page.tsx"
  "app/b/[slug]/page.tsx"
  "components/layout/customer-sidebar.tsx"
  "components/layout/customer-topbar.tsx"
  "app/customer/(customer-layout)/layout.tsx"
)
for f in "${FILES[@]}"; do
  cp "$BACKUP/$f" "$BASE/$f" && echo "restored: $f"
done
echo "Round-3 light-glass state restored."
