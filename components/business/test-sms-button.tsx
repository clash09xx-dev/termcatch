"use client";

import { useState, useTransition } from "react";
import { sendTestSms } from "@/lib/actions/test-sms";
import { GlassButton } from "@/components/ui/glass";
import { useT } from "@/components/i18n/i18n-provider";

export function TestSmsButton() {
  const T = useT().pages.settings;
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run() {
    setMsg(null);
    start(async () => {
      const res = await sendTestSms();
      setMsg(res.ok ? { ok: true, text: T.testSmsOk } : { ok: false, text: res.error ?? T.testSmsFail });
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200/60 pt-4">
      <GlassButton onClick={run} disabled={pending}>{pending ? T.testSmsSending : T.testSms}</GlassButton>
      {msg && <span className="text-xs" style={{ color: msg.ok ? "#0F766E" : "#BE123C" }}>{msg.text}</span>}
    </div>
  );
}
