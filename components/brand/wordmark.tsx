import { cn } from "@/lib/utils";

/**
 * Oficjalny wordmark Termcatch: "term" (szary, regular) + "catch" (grafit, bold).
 * Rozmiar kontrolujesz klasą text-* (np. text-lg, text-2xl).
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline tracking-tight leading-none select-none", className)}>
      <span className="font-normal text-gray-400">term</span>
      <span className="font-bold text-gray-900">catch</span>
      <span className="ml-0.5 w-1 h-1 rounded-full bg-amber-600 self-center mb-0.5 flex-shrink-0" />
    </span>
  );
}
