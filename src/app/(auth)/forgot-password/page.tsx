"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, KeyRound, Mail, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import RequestOtp from "./RequestOtp";
import ResetPassword from "./ResetPassword";
import ResetSuccess from "./ResetSuccess";

type Step = 0 | 1 | 2;

const STEPS = [
  { label: "Email", icon: Mail },
  { label: "Reset", icon: KeyRound },
  { label: "Done", icon: ShieldCheck },
];

const PANEL_COPY: Record<Step, { title: string; body: string }> = {
  0: {
    title: "Forgot your password?",
    body: "No worries — it happens. Enter the email linked to your account and we'll send you a one-time code to reset it.",
  },
  1: {
    title: "Check your inbox",
    body: "Enter the 6-digit code we emailed you and choose a strong new password for your account.",
  },
  2: {
    title: "You're all set!",
    body: "Your password has been updated. Sign in with your new password to get back to your inventory.",
  },
};

const ForgotPasswordPage = () => {
  const [step, setStep] = useState<Step>(0);
  const [email, setEmail] = useState("");

  const copy = PANEL_COPY[step];

  return (
    <div className="flex h-screen">
      {/* Left brand panel — mirrors the login screen */}
      <div className="p-14 w-136.75 bg-secondary-50 flex flex-col gap-14 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-secondary-100 opacity-70 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-secondary-200 opacity-40 blur-3xl" />

        <div className="flex gap-3 relative">
          <Image src="/TiamedsLogo.svg" alt="Tiameds" width={126} height={43} />
        </div>

        <div key={step} className="fp-fade flex flex-col gap-3.5 relative">
          <div className="text-h4 font-semibold">{copy.title}</div>
          <div className="text-[#4B5563] text-p3 font-normal font-noto-sans max-w-100">
            {copy.body}
          </div>
        </div>

        <div className="flex justify-center relative">
          <Image
            src="/Login&RegistrationIcons/LoginDoctorIcon.svg"
            alt="Illustration"
            width={355}
            height={355}
          />
        </div>
      </div>

      {/* Right: flow card */}
      <div className="flex-1 flex items-center justify-center p-14">
        <div className="w-105 border-2 border-pneutral-200 rounded-[14px] bg-white flex flex-col p-10 gap-8 shadow-[0_8px_30px_rgba(17,24,39,0.06)]">
          <Stepper step={step} />

          <div key={step} className="fp-slide">
            {step === 0 && (
              <RequestOtp
                initialEmail={email}
                onSent={(sentTo) => {
                  setEmail(sentTo);
                  setStep(1);
                }}
              />
            )}
            {step === 1 && (
              <ResetPassword
                email={email}
                onChangeEmail={() => setStep(0)}
                onReset={() => setStep(2)}
              />
            )}
            {step === 2 && <ResetSuccess />}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fp-slide-in {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fp-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fp-pop {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes fp-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .fp-slide { animation: fp-slide-in 0.35s ease-out both; }
        .fp-fade  { animation: fp-fade-in 0.4s ease-out both; }
        .fp-pop   { animation: fp-pop 0.5s cubic-bezier(.34,1.56,.64,1) both; }
        .fp-shake { animation: fp-shake 0.4s ease-in-out; }
        @media (prefers-reduced-motion: reduce) {
          .fp-slide, .fp-fade, .fp-pop, .fp-shake { animation: none; }
        }
      `}</style>
    </div>
  );
};

const Stepper = ({ step }: { step: Step }) => (
  <div className="flex items-center">
    {STEPS.map(({ label, icon: Icon }, i) => {
      const done = i < step;
      const active = i === step;
      return (
        <div key={label} className={clsx("flex items-center", i < STEPS.length - 1 && "flex-1")}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={clsx(
                "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                done && "bg-secondary-700 border-secondary-700 text-white",
                active && "border-secondary-700 text-secondary-700 bg-secondary-50 ring-4 ring-secondary-100",
                !done && !active && "border-pneutral-200 text-pneutral-400 bg-white"
              )}
            >
              {done ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
            </div>
            <span
              className={clsx(
                "text-[11px] font-semibold font-noto-sans transition-colors",
                done || active ? "text-secondary-700" : "text-pneutral-400"
              )}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-0.5 mx-2 mb-5 rounded-full bg-pneutral-200 overflow-hidden">
              <div
                className="h-full bg-secondary-700 transition-all duration-500 ease-out"
                style={{ width: done ? "100%" : "0%" }}
              />
            </div>
          )}
        </div>
      );
    })}
  </div>
);

export default ForgotPasswordPage;
