"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n/dictionaries";

// ─── 6-digit e-mail OTP input ────────────────────────────────────────────────
// Segmented numeric boxes with full paste support (paste the whole code into any
// box and it distributes), mobile numeric keyboard (inputMode + pattern), and
// one-time-code autofill. Fully controlled — the parent owns the value string.

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** Fired when all `length` digits are filled (e.g. auto-submit). */
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  /** id for aria-describedby wiring from the parent (error/status text). */
  ariaDescribedBy?: string;
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  hasError = false,
  autoFocus = false,
  ariaDescribedBy,
}: Props) {
  const a = useT().a11y;
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const focusBox = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  };

  const commit = (next: string) => {
    const cleaned = onlyDigits(next).slice(0, length);
    onChange(cleaned);
    if (cleaned.length === length) onComplete?.(cleaned);
    return cleaned;
  };

  const handleChange = (i: number, raw: string) => {
    const digits = onlyDigits(raw);
    if (!digits) {
      // Cleared this box
      const arr = value.split("");
      arr[i] = "";
      commit(arr.join(""));
      return;
    }
    // Typing one or pasting several into a box: fill forward from here.
    const chars = value.split("");
    let cursor = i;
    for (const d of digits) {
      if (cursor >= length) break;
      chars[cursor] = d;
      cursor++;
    }
    const joined = commit(chars.join(""));
    focusBox(Math.min(cursor, length - 1));
    if (joined.length === length) refs.current[length - 1]?.blur();
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const chars = value.split("");
      if (chars[i]) {
        chars[i] = "";
        commit(chars.join(""));
      } else if (i > 0) {
        chars[i - 1] = "";
        commit(chars.join(""));
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const handlePaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = onlyDigits(e.clipboardData.getData("text"));
    if (!pasted) return;
    const chars = value.split("");
    let cursor = i;
    for (const d of pasted) {
      if (cursor >= length) break;
      chars[cursor] = d;
      cursor++;
    }
    const joined = commit(chars.join(""));
    focusBox(Math.min(cursor, length - 1));
    if (joined.length === length) refs.current[length - 1]?.blur();
  };

  return (
    <div className="flex w-full items-center justify-center gap-1.5 sm:gap-2" role="group" aria-label={interpolate(a.otpCode, { n: length })}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length /* allow paste of full code into one box */}
          value={value[i] ?? ""}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={interpolate(a.otpDigit, { i: i + 1, n: length })}
          aria-invalid={hasError}
          aria-describedby={ariaDescribedBy}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            // Flex to fill the card evenly so any length (6/8) fits without
            // overflowing on a narrow phone; capped so boxes don't get huge.
            "flex-1 min-w-0 max-w-[3rem] h-12 sm:h-14 text-lg sm:text-xl text-center font-bold rounded-xl outline-none transition-colors input-glass tabular-nums text-[#0F172A] disabled:opacity-50",
            hasError && "!border-red-400"
          )}
          style={hasError ? { border: "1px solid rgba(248,113,113,0.9)" } : undefined}
        />
      ))}
    </div>
  );
}
