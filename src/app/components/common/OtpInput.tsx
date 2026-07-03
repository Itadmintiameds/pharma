"use client";

import React, { useRef } from "react";

interface OtpInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  onEnter?: () => void;
  attemptsLeft?: number;
  error?: string;
  disabled?: boolean;
}

const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, onEnter, attemptsLeft, error, disabled = false }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (val: string, index: number) => {
    if (disabled) return;
    // Only allow numeric inputs
    if (val && !/^\d+$/.test(val)) return;

    const newOtp = [...value];
    newOtp[index] = val.substring(val.length - 1); // Extract latest character
    onChange(newOtp);

    // Shift focus to the next input field
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (disabled) return;
    if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      onEnter();
    } else if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(pastedData)) return; // Restrict paste values to numeric

    const newOtp = [...value];
    for (let i = 0; i < 6; i++) {
      if (pastedData[i]) {
        newOtp[i] = pastedData[i];
      }
    }
    onChange(newOtp);

    // Shift focus to either the last pasted container or the 6th input box
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <label className="text-p3 font-normal text-[#4B5563] font-body leading-none select-none">
        Enter OTP
      </label>
      <div className="flex justify-between gap-[12px] w-full">
        {value.map((digit, index) => (
          <input
            key={index}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e.target.value, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            disabled={disabled}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            className="w-[42px] h-[48px] min-h-[48px] max-h-[52px] border border-pneutral-200 rounded-[8px] text-center font-bold text-lg focus:outline-none focus:border-secondary-500 focus:ring-1 focus:ring-secondary-500 font-body text-[#1A1F3A] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        ))}
      </div>
    </div>
  );
};

export default OtpInput;
