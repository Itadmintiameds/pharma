import React from "react";
import clsx from "clsx";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
        "rounded-lg font-semibold text-label-l4 transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",

        // Width
        fullWidth ? "w-full" : "w-fit",

        // Sizes
        {
          "h-10 px-4 text-sm": size === "sm",
          "h-12 px-6 text-base": size === "md",
          "h-14 px-8 text-lg": size === "lg",
        },

        // Variants
        {
          "bg-secondary-700 text-white":
            variant === "primary",

          "bg-gray-100 text-gray-800 hover:bg-gray-200":
            variant === "secondary",

          "border border-secondary-700 text-[#6C5CE7] bg-white hover:bg-[#F5F3FF]":
            variant === "outline",
        },

        className
      )}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
};

export default Button;