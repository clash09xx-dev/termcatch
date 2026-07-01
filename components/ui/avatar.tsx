import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "w-6 h-6 text-2xs",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

export function Avatar({
  src,
  firstName = "U",
  lastName,
  size = "md",
  className,
}: AvatarProps) {
  const initials = getInitials(firstName, lastName);

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center font-semibold text-brand-700 dark:text-brand-300 flex-shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt={initials} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
