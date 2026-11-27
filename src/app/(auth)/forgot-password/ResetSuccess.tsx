"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import Button from "@/app/components/common/Button";

const REDIRECT_SECONDS = 5;

const ResetSuccess = () => {
  const router = useRouter();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (seconds <= 0) {
      router.push("/login");
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, router]);

  return (
    <div className="flex flex-col items-center text-center gap-6 py-2">
      <div className="relative flex items-center justify-center">
        <span className="absolute h-24 w-24 rounded-full bg-success-100 animate-ping opacity-40" />
        <div className="fp-pop relative h-20 w-20 rounded-full bg-success-50 border-4 border-success-100 flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-success-700 flex items-center justify-center text-white">
            <Check size={28} strokeWidth={3} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-h5 font-semibold">Password reset!</h2>
        <p className="text-p3 text-pneutral-500 font-noto-sans">
          Your password has been changed successfully.
          <br />
          Please sign in with your new password.
        </p>
      </div>

      <Button variant="primary" fullWidth onClick={() => router.push("/login")}>
        Back to Login
      </Button>

      <p className="text-p2 text-pneutral-400 font-noto-sans -mt-2">
        Redirecting in <span className="tabular-nums font-semibold">{seconds}s</span>…
      </p>
    </div>
  );
};

export default ResetSuccess;
