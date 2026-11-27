"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { Check, Eye, EyeOff, Mail, X } from "lucide-react";
import Input from "@/app/components/common/Input";
import Button from "@/app/components/common/Button";
import OtpInput from "@/app/components/common/OtpInput";
import { forgotPassword, resetPassword } from "@/services/AuthService";
import { showToast } from "@/app/components/common/Toast";

const RESEND_COOLDOWN = 60;
const EMPTY_OTP = ["", "", "", "", "", ""];

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH = [
  { label: "Too weak", color: "bg-warning-500", text: "text-warning-500" },
  { label: "Weak", color: "bg-warning-500", text: "text-warning-500" },
  { label: "Fair", color: "bg-[#F59E0B]", text: "text-[#D97706]" },
  { label: "Good", color: "bg-secondary-500", text: "text-secondary-700" },
  { label: "Strong", color: "bg-success-700", text: "text-success-700" },
];

interface ResetPasswordProps {
  email: string;
  onChangeEmail: () => void;
  onReset: () => void;
}

const ResetPassword = ({ email, onChangeEmail, onReset }: ResetPasswordProps) => {
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP);
  const [otpError, setOtpError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const passed = useMemo(() => RULES.map((r) => r.test(password)), [password]);
  const score = passed.filter(Boolean).length; // 0..5
  const strength = STRENGTH[Math.max(0, score - 1)];
  const allRulesPass = score === RULES.length;
  const otpComplete = otp.every((d) => d !== "");
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = otpComplete && allRulesPass && confirm === password;

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    try {
      await forgotPassword({ userEmail: email });
      showToast.success("A new reset code has been sent to your email.");
      setOtp(EMPTY_OTP);
      setOtpError("");
      setResendTimer(RESEND_COOLDOWN);
    } catch (err) {
      showToast.error((err instanceof Error && err.message) || "Failed to resend the code.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async () => {
    if (!otpComplete) {
      setOtpError("Please enter the 6-digit code.");
      setShakeKey((k) => k + 1);
      return;
    }
    if (!allRulesPass) {
      showToast.warning("Your new password doesn't meet all the requirements.");
      return;
    }
    if (confirm !== password) {
      showToast.warning("Passwords do not match.");
      return;
    }

    setLoading(true);
    setOtpError("");
    try {
      const res = await resetPassword({ userEmail: email, otp: otp.join(""), newPassword: password });
      showToast.success(
        typeof res === "string" && res
          ? res
          : res?.message || "Password reset successfully. Please sign in with your new password."
      );
      onReset();
    } catch (err) {
      const message = (err instanceof Error && err.message) || "Failed to reset password.";
      if (/otp/i.test(message)) {
        setOtpError(message);
        setOtp(EMPTY_OTP);
        setShakeKey((k) => k + 1);
      }
      showToast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const lockIcon = (
    <Image src="/Login&RegistrationIcons/LockIcon.svg" alt="" width={20} height={20} />
  );

  const eyeToggle = (visible: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      className="cursor-pointer focus:outline-none flex items-center justify-center"
      aria-label={visible ? "Hide password" : "Show password"}
    >
      {visible ? (
        <EyeOff size={20} className="text-pneutral-500" />
      ) : (
        <Eye size={20} className="text-pneutral-500" />
      )}
    </button>
  );

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div className="flex flex-col gap-3">
        <h2 className="text-h5 font-semibold">Create new password</h2>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary-50 border border-secondary-100 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Mail size={16} className="text-secondary-700 shrink-0" />
            <span className="text-p3 font-noto-sans text-pneutral-900 truncate">{email}</span>
          </div>
          <button
            type="button"
            onClick={onChangeEmail}
            className="text-p3 font-semibold text-secondary-700 hover:underline shrink-0"
          >
            Change
          </button>
        </div>
      </div>

      {/* OTP */}
      <div className="flex flex-col gap-2">
        <div key={shakeKey} className={shakeKey ? "fp-shake" : undefined}>
          <OtpInput
            value={otp}
            onChange={(v) => {
              setOtp(v);
              if (otpError) setOtpError("");
            }}
            onEnter={handleSubmit}
          />
        </div>
        <div className="flex items-center justify-between text-p2 font-noto-sans min-h-5">
          <span className="text-warning-500">{otpError}</span>
          {resendTimer > 0 ? (
            <span className="text-pneutral-400 font-medium tabular-nums">
              Resend in 0:{String(resendTimer).padStart(2, "0")}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-secondary-700 font-semibold hover:underline disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          )}
        </div>
      </div>

      {/* New password + strength */}
      <div className="flex flex-col gap-3">
        <Input
          label="New Password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={lockIcon}
          rightIcon={eyeToggle(showPassword, () => setShowPassword((v) => !v))}
        />

        {password.length > 0 && (
          <div className="fp-fade flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <div className="flex flex-1 gap-1.5">
                {RULES.map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      "h-1.5 flex-1 rounded-full transition-colors duration-300",
                      i < score ? strength.color : "bg-pneutral-200"
                    )}
                  />
                ))}
              </div>
              <span className={clsx("text-[12px] font-semibold w-16 text-right", strength.text)}>
                {strength.label}
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {RULES.map((rule, i) => (
                <li
                  key={rule.label}
                  className={clsx(
                    "flex items-center gap-1.5 text-[12px] font-noto-sans transition-colors",
                    passed[i] ? "text-success-700" : "text-pneutral-500"
                  )}
                >
                  <span
                    className={clsx(
                      "h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      passed[i] ? "bg-success-700 text-white" : "bg-pneutral-100 text-pneutral-400"
                    )}
                  >
                    {passed[i] ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                  </span>
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Input
        label="Confirm Password"
        type={showConfirm ? "text" : "password"}
        autoComplete="new-password"
        placeholder="Re-enter new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={mismatch ? "Passwords do not match." : undefined}
        success={confirm.length > 0 && !mismatch ? "Passwords match." : undefined}
        leftIcon={lockIcon}
        rightIcon={eyeToggle(showConfirm, () => setShowConfirm((v) => !v))}
      />

      <Button type="submit" variant="primary" fullWidth loading={loading} disabled={!canSubmit}>
        Reset Password
      </Button>
    </form>
  );
};

export default ResetPassword;
