"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  registerAction,
  signInWithGoogleAction,
  signInWithAppleAction,
  verifyEmailOtpAction,
  resendEmailOtpAction,
} from "@/actions/auth";
import type { AuthState } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/ui/password-input";
import { OtpInput } from "@/components/auth/otp-input";

const initialState: AuthState = {};

// Pending-verification handoff, so a refresh / back-navigation on the code screen
// keeps the pending e-mail (and role/destination) instead of dropping the user
// back to an empty form. sessionStorage is per-tab and cleared on success.
// Digits in the e-mail code — must match the Supabase "Email OTP Length" setting
// (currently 8). Change here if that setting changes.
const OTP_LENGTH = 8;
const OTP_STORAGE_KEY = "tc_pending_otp";
type PendingOtp = { email: string; role: "CUSTOMER" | "BUSINESS_OWNER"; next?: string };

function readPendingOtp(): PendingOtp | null {
  try {
    const raw = sessionStorage.getItem(OTP_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p && typeof p.email === "string") {
      return { email: p.email, role: p.role === "BUSINESS_OWNER" ? "BUSINESS_OWNER" : "CUSTOMER", next: typeof p.next === "string" ? p.next : undefined };
    }
  } catch {
    /* ignore */
  }
  return null;
}

// Włącz po skonfigurowaniu Apple Developer Account (Supabase → Providers → Apple)
const APPLE_SIGNIN_ENABLED = false;

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all input-glass";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);
  const [role, setRole] = useState<"CUSTOMER" | "BUSINESS_OWNER">("CUSTOMER");
  const [next, setNext] = useState<string>("");
  const [pending, setPending] = useState<PendingOtp | null>(null);

  // Preselect the business-owner role via ?role=business, capture an optional
  // intended destination (?next / ?redirect, internal only), and restore a
  // pending verification after a refresh / back-navigation.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("role");
    if (r === "business" || r === "BUSINESS_OWNER") setRole("BUSINESS_OWNER");
    const n = params.get("next") ?? params.get("redirect") ?? "";
    if (n.startsWith("/") && !n.startsWith("//")) setNext(n);
    const restored = readPendingOtp();
    if (restored) {
      setRole(restored.role);
      setPending(restored);
    }
  }, []);

  // When the sign-up action moves us to the code step, persist it so a refresh
  // keeps the pending e-mail (and never re-runs sign-up → no duplicate accounts).
  useEffect(() => {
    if (state.step === "verify" && state.email) {
      const p: PendingOtp = { email: state.email, role, next: state.next };
      try { sessionStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
      setPending(p);
    }
  }, [state.step, state.email, state.next, role]);

  // Show the code step from either the just-returned action state or a restored
  // pending record. `state.step` wins on the action-return render (no flash).
  const verify = (state.step === "verify" && state.email)
    ? { email: state.email, role, next: state.next }
    : pending;
  if (verify) {
    return <VerifyEmailStep email={verify.email} role={verify.role} next={verify.next} initialNotice={state.success} />;
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Utwórz konto</h1>
        <p className="mt-1 text-sm text-gray-500">
          Masz już konto?{" "}
          <Link href="/login" className="text-gray-900 font-medium underline underline-offset-2 hover:no-underline transition-all">
            Zaloguj się
          </Link>
        </p>
      </div>

      {/* Role toggle */}
      <div
        className="flex gap-1.5 mb-6 p-1 rounded-xl"
        style={{ background: "rgba(226,232,240,0.50)", border: "1px solid rgba(203,213,225,0.40)" }}
      >
        {(["CUSTOMER", "BUSINESS_OWNER"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={
              role === r
                ? {
                    background: "rgba(255,255,255,0.90)",
                    color: "#0F172A",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)",
                  }
                : { color: "#64748B" }
            }
          >
            {r === "CUSTOMER" ? "Klient" : "Właściciel salonu"}
          </button>
        ))}
      </div>

      {/* OAuth buttons */}
      <div className="space-y-2.5">
        <form action={signInWithGoogleAction}>
          {/* Preserve the selected role through the Google OAuth round-trip. */}
          <input type="hidden" name="role" value={role} />
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors btn-spring"
            style={{
              background: "rgba(255,255,255,0.80)",
              border: "1px solid rgba(203,213,225,0.55)",
              color: "#475569",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.90)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Kontynuuj z Google
          </button>
        </form>

        {/* Apple Sign In — ukryty do czasu konfiguracji Apple Developer Account.
            Aby przywrócić: zmień APPLE_SIGNIN_ENABLED na true. */}
        {APPLE_SIGNIN_ENABLED && (
          <form action={signInWithAppleAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 71 0 130.5 46.4 175 46.4 42.8 0 109.1-49 191.8-49 30.8 0 110.6 2.6 163.9 100.9zm-234.5-181.5c32.4-38.4 56.5-91.4 56.5-144.4 0-7.4-.6-15.5-2-22.3-53.4 2-116.8 35.2-154.5 78.6-29.4 33.6-58.5 86.6-58.5 140.4 0 8.3 1.3 16.6 1.9 19.2 3.2.6 8.4 1.3 13.6 1.3 48 0 108.8-32.1 143-72.8z"/>
              </svg>
              Kontynuuj z Apple
            </button>
          </form>
        )}
      </div>

      <p className="mt-2.5 text-[11px] text-gray-400 leading-relaxed">
        Kontynuując przez {APPLE_SIGNIN_ENABLED ? "Google lub Apple" : "Google"}, akceptujesz{" "}
        <Link href="/terms" target="_blank" className="underline underline-offset-2 hover:text-gray-600">Regulamin</Link>{" "}
        i{" "}
        <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-gray-600">Politykę prywatności</Link>.
      </p>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px" style={{ background: "rgba(203,213,225,0.45)" }} />
        <span className="text-xs" style={{ color: "#94A3B8" }}>lub</span>
        <div className="flex-1 h-px" style={{ background: "rgba(203,213,225,0.45)" }} />
      </div>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">
          {state.success}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="next" value={next} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">Imię</label>
            <input
              id="firstName" name="firstName" type="text"
              autoComplete="given-name" required placeholder="Jan"
              className={inputCls}
            />
            {state.fieldErrors?.firstName && (
              <p className="mt-1 text-xs text-red-500">{state.fieldErrors.firstName[0]}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">Nazwisko</label>
            <input
              id="lastName" name="lastName" type="text"
              autoComplete="family-name" required placeholder="Kowalski"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Adres e-mail</label>
          <input
            id="email" name="email" type="email"
            autoComplete="email" required placeholder="twoj@email.pl"
            className={inputCls}
          />
          {state.fieldErrors?.email && (
            <p className="mt-1 text-xs text-red-500">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Hasło</label>
          <PasswordInput
            id="password" name="password"
            autoComplete="new-password" required placeholder="min. 8 znaków"
            className={inputCls}
          />
          {state.fieldErrors?.password && (
            <p className="mt-1 text-xs text-red-500">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="mt-0.5 w-4 h-4 accent-gray-900 flex-shrink-0"
          />
          <span className="text-xs text-gray-500 leading-relaxed">
            Akceptuję{" "}
            <Link href="/terms" target="_blank" className="text-gray-900 underline underline-offset-2 hover:no-underline">
              Regulamin
            </Link>{" "}
            oraz{" "}
            <Link href="/privacy" target="_blank" className="text-gray-900 underline underline-offset-2 hover:no-underline">
              Politykę prywatności
            </Link>{" "}
            TermCatch.
          </span>
        </label>
        {state.fieldErrors?.acceptTerms && (
          <p className="text-xs text-red-500">{state.fieldErrors.acceptTerms[0]}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 btn-spring glass-shimmer-wrap disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #CBD5E1 0%, #94A3B8 50%, #CBD5E1 100%)",
            color: "#0F172A",
            border: "1px solid rgba(148,163,184,0.45)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.40)",
          }}
        >
          {isPending ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Tworzenie konta...
            </>
          ) : role === "BUSINESS_OWNER" ? "Zarejestruj salon" : "Utwórz konto"}
        </button>
      </form>
    </div>
  );
}

// ─── Step 2: verify the 6-digit e-mail code ──────────────────────────────────
function VerifyEmailStep({
  email,
  role,
  next,
  initialNotice,
}: {
  email: string;
  role: "CUSTOMER" | "BUSINESS_OWNER";
  next?: string;
  initialNotice?: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);
  const [cooldown, setCooldown] = useState(60);
  const [isPending, start] = useTransition();
  // Blocks duplicate verification submissions (auto-submit-on-complete + button).
  const submittingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const submit = (value: string) => {
    if (submittingRef.current || isPending) return;
    if (value.length !== OTP_LENGTH) {
      setError(`Wpisz pełny ${OTP_LENGTH}-cyfrowy kod.`);
      return;
    }
    submittingRef.current = true;
    setError(null);
    setNotice(null);
    start(async () => {
      // On success the server action redirects (session set) — we only reach the
      // lines below on failure. Clear the pending record on success is handled by
      // the redirect leaving this page (a logged-in user can't return to /register).
      const res = await verifyEmailOtpAction(email, value, next);
      submittingRef.current = false;
      if (res?.error) {
        setError(res.error);
        setCode(""); // clear the boxes so the user can retype cleanly
      }
    });
  };

  const resend = () => {
    if (cooldown > 0 || isPending) return;
    setError(null);
    setNotice(null);
    start(async () => {
      const res = await resendEmailOtpAction(email);
      if (res?.error) {
        setError(res.error);
        // If Supabase enforced its own cooldown, keep the button disabled a bit.
        setCooldown(60);
      } else {
        setNotice(res?.success ?? "Wysłaliśmy nowy kod.");
        setCode("");
        setCooldown(60);
      }
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Potwierdź adres e-mail</h1>
        <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
          Wpisz {OTP_LENGTH}-cyfrowy kod, który wysłaliśmy na{" "}
          <span className="font-medium text-gray-900 break-all">{email}</span>.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Zakładasz konto jako {role === "BUSINESS_OWNER" ? "właściciel salonu" : "klient"}.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(code);
        }}
        className="space-y-5"
      >
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (error) setError(null);
          }}
          onComplete={submit}
          length={OTP_LENGTH}
          disabled={isPending}
          hasError={!!error}
          autoFocus
          ariaDescribedBy="otp-status"
        />

        {/* Accessible live region — announces success/error to screen readers */}
        <div id="otp-status" aria-live="polite" className="min-h-[1rem] text-center">
          {error ? (
            <p role="alert" className="text-sm font-medium text-red-600">{error}</p>
          ) : notice ? (
            <p className="text-sm text-gray-500">{notice}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isPending || code.length !== OTP_LENGTH}
          className="w-full py-2.5 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 btn-spring glass-shimmer-wrap disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #CBD5E1 0%, #94A3B8 50%, #CBD5E1 100%)",
            color: "#0F172A",
            border: "1px solid rgba(148,163,184,0.45)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.40)",
          }}
        >
          {isPending ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Weryfikacja...
            </>
          ) : (
            "Zweryfikuj i kontynuuj"
          )}
        </button>
      </form>

      {/* Resend with visible countdown + cooldown */}
      <div className="mt-5 text-center text-sm">
        {cooldown > 0 ? (
          <span className="text-gray-400">
            Nie masz kodu? Wyślij ponownie za <span className="tabular-nums font-medium text-gray-500">{cooldown}s</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={isPending}
            className="text-gray-900 font-medium underline underline-offset-2 hover:no-underline transition-all disabled:opacity-50"
          >
            Wyślij kod ponownie
          </button>
        )}
      </div>

      <div className="mt-6 pt-5 text-center" style={{ borderTop: "1px solid rgba(203,213,225,0.45)" }}>
        {/* Clear the pending record + full reload so a different address can be used */}
        <a
          href="/register"
          onClick={() => { try { sessionStorage.removeItem(OTP_STORAGE_KEY); } catch { /* ignore */ } }}
          className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
        >
          Użyj innego adresu e-mail
        </a>
      </div>
    </div>
  );
}
