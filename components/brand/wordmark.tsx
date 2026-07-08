import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline leading-none select-none",
        className
      )}
      style={{ letterSpacing: "-0.03em" }}
    >
      {/* "term" — muted, normal weight */}
      <span
        className={cn("font-normal", variant === "dark" ? "text-white/35" : "text-slate-400")}
      >
        term
      </span>

      {/* "catch" — bold, subtle chrome gradient */}
      <span
        className={cn("font-bold", variant === "dark" ? "text-white" : "")}
        style={
          variant === "light"
            ? {
                background:
                  "linear-gradient(135deg, #1E293B 0%, #334155 50%, #1E293B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }
            : undefined
        }
      >
        catch
      </span>

      {/* Chrome dot — brand accent */}
      <span
        className="ml-[3px] self-center mb-[1px] flex-shrink-0"
        style={{
          display: "inline-block",
          width: "4px",
          height: "4px",
          borderRadius: "9999px",
          background:
            variant === "dark"
              ? "rgba(255,255,255,0.50)"
              : "linear-gradient(135deg, #94A3B8 0%, #CBD5E1 100%)",
          boxShadow:
            variant === "light"
              ? "0 0 0 1px rgba(203,213,225,0.40), 0 1px 3px rgba(148,163,184,0.30)"
              : "none",
        }}
      />
    </span>
  );
}
