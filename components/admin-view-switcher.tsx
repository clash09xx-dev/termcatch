"use client";

import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/i18n-provider";
import { ViewSwitchDot, type ViewSwitchItem } from "@/components/view-switch-dot";

/**
 * The INTERNAL three-context switch: Client / Salon / Owner.
 *
 * Visible only to platform admins (lib/is-admin isPlatformAdmin, which reads the
 * DB role or ADMIN_EMAILS — never self-writable Supabase user_metadata). It lets
 * us look at the product through a customer's eyes, a salon's, and the platform
 * owner's, in one click.
 *
 * WHY IT KEEPS THREE OPTIONS
 * "Owner" here is the PLATFORM admin area (/admin), not a salon role. Normal
 * salon owners and specialists must never see it — for them, owner is an
 * authorization level inside the salon context, and their switch is the two-way
 * ProductViewSwitcher. The two components are gated apart in the layouts by
 * resolveViewSwitch, so this list cannot leak to a non-admin.
 *
 * WHY IT LOOKS LIKE A DOT NOW
 * It used to be a permanently expanded dark pill reading "WIDOK | Klient | Salon
 * | Właściciel", parked over the corner of every page with hardcoded Polish
 * labels. An internal debugging aid should not be the loudest chrome on screen,
 * and it should not be the one control in the product that ignores the selected
 * language. It now shares the collapsed-dot shell with the product switch, so
 * both behave identically and both are localized.
 */
export function AdminViewSwitcher() {
  const t = useT();
  const pathname = usePathname();

  const items: ViewSwitchItem[] = [
    { key: "client", href: "/customer/dashboard", label: t.viewSwitch.client, aria: t.viewSwitch.ariaClient },
    { key: "salon", href: "/business/dashboard", label: t.viewSwitch.salon, aria: t.viewSwitch.ariaSalon },
    { key: "owner", href: "/admin/dashboard", label: t.viewSwitch.owner, aria: t.viewSwitch.ariaOwner },
  ];

  // Which context are we in? Longest matching prefix wins, so /admin does not
  // also read as /a… anything else. Falls back to "client".
  const current =
    pathname.startsWith("/admin") ? "owner" : pathname.startsWith("/business") ? "salon" : "client";

  return <ViewSwitchDot items={items} current={current} />;
}
