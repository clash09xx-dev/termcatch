import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium rounded-full",
  {
    variants: {
      variant: {
        default: "bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200",
        brand: "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300",
        success: "bg-success-50 text-success-700",
        warning: "bg-warning-50 text-warning-700",
        danger: "bg-danger-50 text-danger-700",
        outline: "border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300",
      },
      size: {
        sm: "text-2xs px-1.5 py-0.5",
        md: "text-xs px-2 py-1",
        lg: "text-sm px-3 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}
