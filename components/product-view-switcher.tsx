"use client";

import { useT } from "@/components/i18n/i18n-provider";
import { ViewSwitchDot, type ViewSwitchItem } from "@/components/view-switch-dot";

/**
 * Client ⇄ Salon view switch, for anyone with a real salon context.
 *
 * Rendered ONLY after the server has resolved that context from the session
 * (lib/ownership resolveBusinessAccess → resolveViewSwitch === "owner" |
 * "employee") — never gated by the frontend alone. A plain customer gets no
 * switch, no dot and no reserved space, because the layout renders nothing at
 * all for them.
 *
 * EXACTLY TWO VIEWS. There is deliberately no third platform mode here: being an
 * owner is an authorization LEVEL inside the salon context, not a product mode a
 * normal user switches into. The internal three-context switch lives in
 * AdminViewSwitcher, separately gated on isPlatformAdmin().
 *
 * `salonHref` is where THIS session's salon lives, decided by the server:
 * /business/dashboard for an owner, /employee/dashboard for an approved
 * specialist. The component never derives it and never receives a business
 * identifier, so no amount of client tampering can point it at another salon —
 * the worst a forged value could do is navigate to a route that then re-checks
 * membership server-side and redirects.
 *
 * `current` is fixed by the layout that mounts this (business/employee layout →
 * "salon", customer layout → "client"). Clicking records a presentation-only
 * `ownerView` cookie; server authorization never trusts it.
 */
export function ProductViewSwitcher({
  current,
  salonHref,
}: {
  current: "client" | "salon";
  /** Server-resolved destination for the Salon side. */
  salonHref: string;
}) {
  const t = useT();

  const items: ViewSwitchItem[] = [
    { key: "client", href: "/customer/dashboard", label: t.viewSwitch.client, aria: t.viewSwitch.ariaClient },
    { key: "salon", href: salonHref, label: t.viewSwitch.salon, aria: t.viewSwitch.ariaSalon },
  ];

  return (
    <ViewSwitchDot
      items={items}
      current={current}
      onSelect={(key) => {
        // Presentation persistence only — NOT an authorization signal.
        document.cookie = `ownerView=${key}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
      }}
    />
  );
}
