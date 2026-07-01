import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        default:
          "bg-brand-600 hover:bg-brand-700 text-white shadow-brand hover:shadow-brand-lg",
        secondary:
          "bg-surface-100 hover:bg-surface-200 text-surface-800 dark:bg-surface-800 dark:hover:bg-surface-700 dark:text-surface-100",
        outline:
          "border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-200",
        ghost:
          "hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-200",
        danger:
          "bg-danger-500 hover:bg-danger-600 text-white shadow-sm",
        success:
          "bg-success-500 hover:bg-success-600 text-white shadow-sm",
        link:
          "text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "text-xs px-3 py-1.5 rounded-lg",
        md: "text-sm px-4 py-2.5 rounded-xl",
        lg: "text-sm px-6 py-3 rounded-xl",
        xl: "text-base px-8 py-4 rounded-2xl",
        icon: "p-2 rounded-lg",
        "icon-sm": "p-1.5 rounded-md",
        "icon-lg": "p-3 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin w-4 h-4 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export { buttonVariants };
