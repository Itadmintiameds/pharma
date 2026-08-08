import React, { forwardRef } from "react";
import clsx from "clsx";

/** Field height/padding preset. `lg` is the standard form field. */
export type InputSize = "sm" | "md" | "lg";

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  sizeVariant?: InputSize;
  required?: boolean;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Rendered flush inside the field border (e.g. a country-code select). */
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  labelClassName?: string;
  containerClassName?: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "tel"
    | "url"
    | "search"
    | "date"
    | "month"
    | "time";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      sizeVariant = "lg",
      required,
      error,
      success,
      hint,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      className,
      labelClassName,
      containerClassName,
      disabled = false,
      readOnly = false,
      type = "text",
      onKeyDown,
      ...props
    },
    ref
  ) => {
    // State styles applied on the wrapper: disabled > readonly > error > success > enabled/active
    const getStateStyles = () => {
      if (disabled)
        return "border-pneutral-300 bg-sneutral-100 cursor-not-allowed";
      if (readOnly)
        return "border-pneutral-300 bg-pneutral-50 cursor-default";
      if (error)
        return "border-warning-500 bg-white focus-within:ring-1 focus-within:ring-warning-500";
      if (success)
        return "border-success-700 bg-white focus-within:ring-1 focus-within:ring-success-700";
      return "border-pneutral-300 bg-white focus-within:border-secondary-300 focus-within:ring-1 focus-within:ring-secondary-300";
    };

    // Height and corner radius per size; the text size follows on the input.
    const fieldSizeStyles: Record<InputSize, string> = {
      sm: "h-9 rounded-[4px]",
      md: "h-11 rounded-md",
      lg: "h-12 rounded-md",
    };

    const textSizeStyles: Record<InputSize, string> = {
      sm: "px-2 text-p3",
      md: "px-3 text-p4",
      lg: "px-3 text-p4",
    };

    return (
      <div className={clsx("w-full", containerClassName)}>
        {label && (
          <label
            className={clsx(
              "mb-1 block text-label-l4 font-medium justify-center transition-colors duration-200",
              disabled ? "text-pneutral-500" : "text-pneutral-900",
              labelClassName
            )}
          >
            {label}
            {required && (
              <span className="ml-2 text-warning-500 font-semibold text-label-l2">*</span>
            )}
          </label>
        )}

        <div
          className={clsx(
            "flex w-full items-center border transition-all duration-200",
            fieldSizeStyles[sizeVariant],
            getStateStyles(),
            className
          )}
        >
          {leftAddon && (
            <div className={clsx("h-full shrink-0", disabled && "opacity-60")}>
              {leftAddon}
            </div>
          )}

          {leftIcon && (
            <div className={clsx("pl-3", disabled && "opacity-60")}>{leftIcon}</div>
          )}

          <input
            ref={ref}
            type={type}
            disabled={disabled}
            readOnly={readOnly}
            onKeyDown={(e) => {
              // Prevent scientific notation in number inputs
              if (type === "number" && ["e", "E", "+", "-"].includes(e.key)) {
                e.preventDefault();
              }
              onKeyDown?.(e);
            }}
            className={clsx(
              "h-full w-full bg-transparent outline-none placeholder:text-pneutral-500",
              textSizeStyles[sizeVariant],
              disabled
                ? "text-pneutral-500 cursor-not-allowed"
                : readOnly
                ? "text-pneutral-800 cursor-default"
                : "text-pneutral-900"
            )}
            {...props}
          />

          {rightIcon && (
            <div className={clsx("pr-3", disabled && "opacity-60")}>
              {rightIcon}
            </div>
          )}

          {rightAddon && (
            <div className={clsx("h-full shrink-0", disabled && "opacity-60")}>
              {rightAddon}
            </div>
          )}
        </div>

        {(error || success || hint) && (
          <p
            className={clsx(
              "mt-1 text-p2",
              error
                ? "text-warning-500"
                : success
                ? "text-success-700"
                : "text-pneutral-500"
            )}
          >
            {error || success || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
