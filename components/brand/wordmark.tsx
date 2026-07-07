import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  return (
    <span className={cn("inline-flex items-baseline tracking-tight leading-none select-none", className)}>
      <span className={cn("font-normal", variant === "dark" ? "text-white/40" : "text-gray-400")}>term</span>
      <span className={cn("font-bold", variant === "dark" ? "text-white" : "text-gray-900")}>catch</span>
      <span className="ml-0.5 w-1 h-1 rounded-full bg-gold-400 self-center mb-0.5 flex-shrink-0" />
    </span>
  );
}
