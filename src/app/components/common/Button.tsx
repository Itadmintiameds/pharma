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
        "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",

        fullWidth && "w-full",

        {
          "h-10 px-4 text-sm": size === "sm",
          "h-12 px-6 text-base": size === "md",
          "h-11 text-label-l3": size === "lg",
        },

        {
          "bg-secondary-700 text-white": variant === "primary",
          "bg-gray-100 text-gray-800": variant === "secondary",
          "border border-secondary-700 bg-white text-[#6C5CE7]":
            variant === "outline",
        },

        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
