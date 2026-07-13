import { ComingSoon } from "@/components/ui/glass";

// Coupons have no backend yet — an honest "wkrótce" beats a form that
// pretends to save. (The old modal's "Zapisz kupon" silently did nothing.)
export default function CouponsPage() {
  return (
    <ComingSoon
      title="Kupony i promocje"
      body="Kody rabatowe — procentowe i kwotowe, z limitem użyć i datą ważności. Pracujemy nad tym; kupony wejdą w planie Zespół."
      icon={
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" x2="7.01" y1="7" y2="7" />
        </svg>
      }
    />
  );
}
