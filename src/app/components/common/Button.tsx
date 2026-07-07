import React from "react";
import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "h-12 inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",

        fullWidth && "w-full",

        // {
        //   "w-35.25 px-4 text-sm": size === "sm",
        //   "h-12 px-6 text-base": size === "md",
        //   "h-11 text-label-l3": size === "lg",
        // },

        {
          "bg-secondary-700 text-white text-label-l4": variant === "primary",
          "bg-info-500 text-white text-label-l4": variant === "secondary",
          "border-2 border-pneutral-600 w-35.25 text-pneutral-600 text-label-l2":
            variant === "outline",
        },

        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
