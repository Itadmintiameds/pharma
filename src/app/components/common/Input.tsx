import React, { forwardRef } from "react";
import clsx from "clsx";

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
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
    | "time";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
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
            "flex h-12 w-full items-center rounded-md border transition-all duration-200",
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
              "h-full w-full bg-transparent px-3 text-p4 outline-none placeholder:text-pneutral-500",
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
