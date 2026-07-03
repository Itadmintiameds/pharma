"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Input from "@/app/components/common/Input";
import Button from "@/app/components/common/Button";
import { login as loginService } from "@/services/AuthService";
import { showToast } from "@/app/components/common/Toast";

interface LoginProps {
  onSubmit: (email: string, password?: string) => void;
}

const Login = ({ onSubmit }: LoginProps) => {
  const [userEmail, setUserEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!userEmail || !password) {
      showToast.warning("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await loginService({ userEmail, password });
      showToast.success("OTP sent successfully to your email.");
      onSubmit(userEmail, password);
    } catch (err: any) {
      showToast.error(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-97.75 h-[489px] border-2 border-pneutral-200 rounded-[14px] flex flex-col p-10 gap-9 bg-white justify-between">
      <div className="text-h5 font-semibold">
        Login to Your Account
      </div>

      <div className="flex flex-col gap-5 flex-1 justify-center">

        <Input
          label="Email ID"
          placeholder="abc@hospital.in"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
          leftIcon={
            <Image
              src="/Login&RegistrationIcons/UsernameIcon.svg"
              alt="User"
              width={20}
              height={20}
            />
          }
        />

        <div>
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
            leftIcon={
              <Image
                src="/Login&RegistrationIcons/LockIcon.svg"
                alt="Lock"
                width={20}
                height={20}
              />
            }
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer focus:outline-none flex items-center justify-center"
              >
                <Image
                  src="/Login&RegistrationIcons/PasswordIcon.svg"
                  alt="Eye"
                  width={20}
                  height={20}
                />
              </button>
            }
          />

          <span className="text-p2 font-semibold font-noto-sans text-secondary-700 flex justify-end mt-1">
            Forgot Password?
          </span>
        </div>

        <div className="flex items-center gap-3 font-noto-sans">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[#6C5CE7]"
          />

          <span className="font-normal text-[#4B5563] text-p2">
            Remember Me
          </span>
        </div>

        <Button size="lg" onClick={handleLogin} loading={loading}>
          Send OTP
        </Button>

        <div className="flex font-noto-sans text-p3 font-normal gap-3 justify-center">
          <span className="text-pneutral-900">
            Don't have an account?
          </span>
          <Link href="/registration" className="text-secondary-700 cursor-pointer font-semibold hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;