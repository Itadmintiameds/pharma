import React, { forwardRef } from "react";
import clsx from "clsx";

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
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
      leftIcon,
      rightIcon,
      className,
      type = "text",
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1 block text-label-l4 font-medium text-pneutral-900 justify-center">
            {label}
            {required && (
              <span className="ml-2 text-warning-500 font-semibold text-label-l2">*</span>
            )}
          </label>
        )}

        <div
          className={clsx(
            "flex h-12 w-full items-center rounded-md border bg-white transition-all",
            error
              ? "border-warning-500"
              : "border-pneutral-300",
            className
          )}
        >
          {leftIcon && (
            <div className="pl-3">{leftIcon}</div>
          )}

          <input
            ref={ref}
            type={type}
            className="h-full w-full bg-transparent px-3 text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500"
            {...props}
          />

          {rightIcon && (
            <div className="pr-3">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1 text-p2 text-warning-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;