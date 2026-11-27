"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Input from "@/app/components/common/Input";
import Button from "@/app/components/common/Button";
import { forgotPassword } from "@/services/AuthService";
import { showToast } from "@/app/components/common/Toast";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RequestOtpProps {
  initialEmail: string;
  onSent: (email: string) => void;
}

const RequestOtp = ({ initialEmail, onSent }: RequestOtpProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await forgotPassword({ userEmail: trimmed });
      showToast.success(
        typeof res === "string" && res
          ? res
          : res?.message || "If an account exists for this email, a reset OTP has been sent."
      );
      onSent(trimmed);
    } catch (err) {
      showToast.error(
        (err instanceof Error && err.message) || "Could not send the reset code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-h5 font-semibold">Reset your password</h2>
        <p className="text-p3 text-pneutral-500 font-noto-sans">
          We&apos;ll email you a 6-digit verification code.
        </p>
      </div>

      <Input
        label="Email ID"
        type="email"
        placeholder="abc@hospital.in"
        autoFocus
        autoComplete="email"
        value={email}
        error={error}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError("");
        }}
        leftIcon={
          <Image src="/Login&RegistrationIcons/UsernameIcon.svg" alt="" width={20} height={20} />
        }
      />

      <Button type="submit" variant="primary" fullWidth loading={loading}>
        Send Reset Code
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-p3 font-semibold text-pneutral-500 hover:text-secondary-700 transition-colors font-noto-sans"
      >
        <ArrowLeft size={16} />
        Back to Login
      </Link>
    </form>
  );
};

export default RequestOtp;
