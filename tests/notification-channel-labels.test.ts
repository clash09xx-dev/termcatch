import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NOTIF_CHANNELS, SALON_EVENTS, type NotifChannel } from "../lib/notification-settings";
import { pl } from "../lib/i18n/dictionaries/pl";
import { en } from "../lib/i18n/dictionaries/en";
import { de } from "../lib/i18n/dictionaries/de";
import { tr } from "../lib/i18n/dictionaries/tr";

/**
 * On mobile the event matrix rendered four rows of three bare checkboxes with
 * no header — the header row is `hidden sm:grid`, so a phone user could only
 * guess what each column meant from its position.
 *
 * The channels are the real ones the dispatcher gates on (lib/notification-settings
 * salonWants): in-app, email, SMS. These tests pin the labels to that list, in
 * all four launch locales, and pin every control to an accessible name that
 * spells out BOTH the event and the channel — so meaning never depends on
 * column position on any screen size.
 */

const DICTS = { pl, en, de, tr };
const FORM = "components/business/notification-settings-form.tsx";

describe("notification channels — labels and accessible names", () => {
  test("1. the channels are exactly the three the dispatcher supports, in render order", () => {
    assert.deepEqual(
      NOTIF_CHANNELS.map((c) => c.key),
      ["inApp", "email", "sms"] satisfies NotifChannel[]
    );
  });

  test("2. every channel has a real, non-empty label in PL / EN / DE / TR", () => {
    for (const [locale, dict] of Object.entries(DICTS)) {
      for (const { key, labelKey } of NOTIF_CHANNELS) {
        const label = dict.pages.settings[labelKey];
        assert.equal(typeof label, "string", `${locale}.${labelKey} missing`);
        assert.ok(label.trim().length > 0, `${locale}.${labelKey} is empty (channel ${key})`);
      }
    }
  });

  test("3. the labels say what the channel actually is (no placeholder or copy-paste)", () => {
    // Polish, per the product's own terminology.
    assert.equal(pl.pages.settings.colApp, "Aplikacja");
    assert.equal(pl.pages.settings.colEmail, "E-mail");
    assert.equal(pl.pages.settings.colSms, "SMS");
    assert.equal(en.pages.settings.colApp, "App");
    assert.equal(en.pages.settings.colEmail, "Email");
    assert.equal(en.pages.settings.colSms, "SMS");
    // Localized, not left in English.
    assert.equal(de.pages.settings.colEmail, "E-Mail");
    assert.equal(de.pages.settings.colApp, "App");
    assert.equal(tr.pages.settings.colApp, "Uygulama");
    assert.equal(tr.pages.settings.colEmail, "E-posta");
    // The three labels must be distinguishable from each other in every locale.
    for (const [locale, dict] of Object.entries(DICTS)) {
      const labels = NOTIF_CHANNELS.map((c) => dict.pages.settings[c.labelKey]);
      assert.equal(new Set(labels).size, 3, `${locale} reuses a channel label`);
    }
  });

  test("4. every event has a label in all four locales", () => {
    for (const [locale, dict] of Object.entries(DICTS)) {
      for (const { key } of SALON_EVENTS) {
        const label = dict.notifEvents[key];
        assert.ok(label && label.trim().length > 0, `${locale}.notifEvents.${key} missing`);
      }
    }
  });

  test("5. each checkbox's accessible name carries BOTH the event and the channel", () => {
    const src = readFileSync(FORM, "utf8");
    // aria-label={`${eventLabel} — ${channelLabel}`}
    assert.ok(
      /aria-label=\{`\$\{eventLabel\}[^`]*\$\{channelLabel\}`\}/.test(src),
      "the accessible name must name the event and the channel, not the raw key"
    );
    // The old name leaked the internal key ("… · inApp") — never acceptable.
    assert.ok(!src.includes("· ${ch}"), "accessible name must not expose the internal channel key");
  });

  test("6. labels are rendered next to each control on mobile, and as headers on sm+", () => {
    const src = readFileSync(FORM, "utf8");
    // Header row: present from sm up only.
    assert.ok(src.includes('className="hidden sm:grid'), "expected an sm+ header row");
    // Per-control label: visible on mobile, hidden once the header takes over.
    assert.ok(
      /className="text-\[11px\][^"]*sm:hidden"/.test(src),
      "expected a per-control channel label that shows on mobile and hides on sm+"
    );
    // The mobile chips collapse back into the header-aligned grid on sm+.
    assert.ok(src.includes("sm:contents"), "expected the mobile wrapper to collapse on sm+");
  });

  test("7. the mobile row cannot overflow and keeps a real tap target", () => {
    const src = readFileSync(FORM, "utf8");
    // flex-1 shares the width between three controls instead of a fixed 3-col
    // grid that would overflow a narrow screen.
    assert.ok(src.includes("flex-1 sm:flex-none"), "channel controls must flex on mobile");
    assert.ok(/min-h-\[3[0-9]px\]/.test(src), "expected a >=30px tap target on mobile");
  });

  test("8. the form derives channels from the shared list, not its own literal", () => {
    const src = readFileSync(FORM, "utf8");
    assert.ok(src.includes("NOTIF_CHANNELS.map"), "the form must render the shared channel list");
    assert.ok(
      !/\(\["inApp", "email", "sms"\] as const\)\.map/.test(src),
      "a second hardcoded channel list is how the header and the controls drifted apart"
    );
  });

  test("9. the checkbox names still match what the server action parses", () => {
    // Renaming a channel key would silently stop persisting that column.
    const src = readFileSync(FORM, "utf8");
    assert.ok(src.includes("name={`ev_${ev.key}_${ch}`}"));
    const action = readFileSync("lib/actions/notification-settings.ts", "utf8");
    for (const { key } of NOTIF_CHANNELS) {
      assert.ok(
        action.includes(key),
        `the server action must know the "${key}" channel to persist it`
      );
    }
  });
});
