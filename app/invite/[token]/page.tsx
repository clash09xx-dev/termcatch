export const dynamic = "force-dynamic";

import Link from "next/link";
import { getInvitationPreview } from "@/lib/actions/employee-invitations";
import { GlassCard } from "@/components/ui/glass";
import { InviteForm } from "./invite-form";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const preview = await getInvitationPreview(token);

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "radial-gradient(ellipse 90% 60% at 10% 0%, rgba(226,232,240,0.40) 0%, transparent 50%), #F2F7FC" }}>
      <div className="w-full max-w-sm">
        <GlassCard className="p-6">
          {preview.ok ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Zaproszenie do zespołu</p>
              <h1 className="mt-1 text-xl font-bold text-slate-900" style={{ letterSpacing: "var(--track-title)" }}>{preview.businessName}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Cześć{preview.employeeName ? ` ${preview.employeeName.split(" ")[0]}` : ""}! Utwórz swoje konto pracownika, aby zobaczyć swój grafik, wizyty i asystenta AI.
              </p>
              <div className="mt-4">
                <InviteForm token={token} email={preview.email} />
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900">Zaproszenie nieaktywne</h1>
              <p className="mt-2 text-sm text-slate-600">{preview.error}</p>
              <p className="mt-1 text-xs text-slate-500">Poproś właściciela salonu o ponowne wysłanie zaproszenia.</p>
              <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-slate-700 hover:text-slate-900">Przejdź do logowania →</Link>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
