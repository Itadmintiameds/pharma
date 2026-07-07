"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/common/Button";
import { verifyOtp as verifyOtpService, login as loginService } from "@/services/AuthService";
import { showToast } from "@/app/components/common/Toast";
import OtpInput from "@/app/components/common/OtpInput";

interface OtpProps {
  email: string;
  password?: string;
  onBack: () => void;
}

const Otp = ({ email, password, onBack }: OtpProps) => {
  const router = useRouter();
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [errorMsg, setErrorMsg] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Countdown handler for resend cooldown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleResend = async () => {
    if (resendTimer > 0) return;
    if (!password) {
      showToast.error("Session expired. Please return to login.");
      return;
    }

    // Immediately show initiation toast
    showToast.info("Initiated new OTP");

    try {
      await loginService({ userEmail: email, password });
      showToast.success("A new OTP has been sent successfully!");
      
      // Reset validation states to unfreeze input fields
      setAttemptsLeft(3);
      setOtp(["", "", "", "", "", ""]);
      setErrorMsg("");
      
      setResendTimer(60); // 60 seconds cooldown
    } catch (err: any) {
      showToast.error(err?.message || "Failed to resend OTP.");
    }
  };

  const handleVerify = async () => {
    const fullOtp = otp.join("");
    if (fullOtp.length < 6) {
      showToast.warning("Please enter a valid 6-digit OTP code.");
      return;
    }
    
    setLoading(true);
    setErrorMsg("");
    try {
      console.log("Verifying OTP for:", email, "with code:", fullOtp);
      await verifyOtpService({ userEmail: email, otp: fullOtp });
      showToast.success("Successfully logged in! Redirecting...");
      router.push("/dashboard");
    } catch (err: any) {
      if (err?.message === "Invalid OTP") {
        const nextAttempts = Math.max(0, attemptsLeft - 1);
        setAttemptsLeft(nextAttempts);
        setErrorMsg("Invalid OTP");
        showToast.error(`Invalid OTP. You have ${nextAttempts} attempts remaining.`);
      } else if (err?.message === "Account Locked") {
        setErrorMsg("Account Locked");
        showToast.error("Your account has been temporarily locked due to multiple failed login attempts. Please try again after 30 minutes.");
      } else {
        setErrorMsg(err?.message || "Invalid OTP code.");
        showToast.error(err?.message || "Invalid OTP code.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[391px] h-[370px] border border-pneutral-200 rounded-[14px] bg-white flex flex-col p-10 gap-[36px] select-none justify-between">
      {/* Title */}
      <h2 className="text-h5 font-semibold text-black font-heading leading-tight">
        Login to Your Account
      </h2>

      {/* Reusable OTP Input Component */}
      <OtpInput 
        value={otp} 
        onChange={setOtp} 
        onEnter={handleVerify} 
        attemptsLeft={attemptsLeft}
        error={errorMsg}
        disabled={attemptsLeft <= 0}
      />

      {/* Actions */}
      <div className="flex flex-col gap-4 mt-auto">
        <Button 
          variant="primary"
          onClick={handleVerify} 
          loading={loading}
          disabled={attemptsLeft <= 0}
        >
          Login
        </Button>
        <div className="flex font-noto-sans text-p3 font-normal gap-3 justify-center">
          <span className="text-pneutral-900">Didn't get the code?</span>
          {resendTimer > 0 ? (
            <span className="text-pneutral-400 font-medium select-none">
              Resend in {resendTimer}s
            </span>
          ) : (
            <span 
              onClick={handleResend} 
              className="text-secondary-700 cursor-pointer hover:underline font-semibold"
            >
              Resend OTP
            </span>
          )}
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