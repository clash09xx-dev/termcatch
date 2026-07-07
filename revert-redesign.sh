#!/bin/bash
# TermCatch — revert-redesign.sh
# Restores ALL files to the state captured BEFORE the premium redesign.
# Run from the project root: bash revert-redesign.sh

set -e
BACKUP="$(dirname "$0")/_backup"

echo "Reverting to pre-redesign snapshot..."

cp "$BACKUP/tailwind.config.ts"                          tailwind.config.ts
cp "$BACKUP/app/globals.css"                             app/globals.css
cp "$BACKUP/app/page.tsx"                                app/page.tsx
cp "$BACKUP/app/layout.tsx"                              app/layout.tsx
cp "$BACKUP/components/layout/landing-nav.tsx"           components/layout/landing-nav.tsx
cp "$BACKUP/components/layout/landing-footer.tsx"        components/layout/landing-footer.tsx
cp "$BACKUP/components/layout/business-sidebar.tsx"      components/layout/business-sidebar.tsx
cp "$BACKUP/components/layout/business-topbar.tsx"       components/layout/business-topbar.tsx
cp "$BACKUP/components/brand/wordmark.tsx"               components/brand/wordmark.tsx
cp "$BACKUP/app/business/(business-layout)/profile-client.tsx" \
   "app/business/(business-layout)/profile/profile-client.tsx"

echo "Done. All files restored. Run: pnpm dev to verify."
