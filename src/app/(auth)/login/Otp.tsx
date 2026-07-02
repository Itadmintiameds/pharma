"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/common/Button";

interface OtpProps {
  onBack: () => void;
}

const Otp = ({ onBack }: OtpProps) => {
  const router = useRouter();
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    // Only allow numeric input
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // Get last typed character
    setOtp(newOtp);

    // Auto-focus next input field
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Move to previous field on backspace if current field is empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const fullOtp = otp.join("");
    if (fullOtp.length < 6) {
      alert("Please enter a valid 6-digit OTP code.");
      return;
    }
    
    // Simulate API Verification and Route to Dashboard
    console.log("Verifying OTP:", fullOtp);
    router.push("/dashboard");
  };

  return (
    <div className="w-[391px] h-[370px] border border-pneutral-200 rounded-[14px] bg-white flex flex-col p-10 gap-[36px] select-none">
      {/* Title */}
      <h2 className="text-h5 font-semibold text-black font-heading leading-tight">
        Login to Your Account
      </h2>

      {/* OTP Field Block */}
      <div className="flex flex-col gap-2.5 h-[78px] w-full">
        <label className="text-p3 font-normal text-[#4B5563] font-body leading-none">
          Enter OTP
        </label>
        <div className="flex justify-between gap-[12px] w-full">
          {otp.map((digit, index) => (
            <input
              key={index}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              className="w-[42px] h-[48px] min-h-[48px] max-h-[52px] border border-pneutral-200 rounded-[8px] text-center font-bold text-lg focus:outline-none focus:border-secondary-500 focus:ring-1 focus:ring-secondary-500 font-body text-[#1A1F3A]"
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4 mt-auto">
        <Button size="lg" onClick={handleVerify}>
          Login
        </Button>
        <div className="flex font-noto-sans text-p3 font-normal gap-3 justify-center">
          <span className="text-pneutral-900">Didn't get the code?</span>
          <span className="text-secondary-700 cursor-pointer hover:underline font-medium">
            Resend OTP
          </span>
        </div>
        <div className="text-center -mt-2">
          <span 
            onClick={onBack} 
            className="text-pneutral-500 hover:text-secondary-700 cursor-pointer font-semibold text-p3 transition-colors"
          >
            Back to Login
          </span>
        </div>
      </div>
    </div>
  );
};

export default Otp;