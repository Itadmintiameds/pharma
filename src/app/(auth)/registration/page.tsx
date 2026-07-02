"use client";

import Input from "@/app/components/common/Input";
import React, { useState } from "react";
import Image from "next/image";
import Button from "@/app/components/common/Button";

const page = () => {
  const [isChecked, setIsChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const validatePassword = (password: string) => {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,20}$/;

    if (!password) {
      return "Password is required";
    }

    if (!passwordRegex.test(password)) {
      return "Password must be 8-20 characters and include an uppercase letter, lowercase letter, number, and special character.";
    }

    return "";
  };
const handleSubmit = () => {
  // Registration API call
};

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setPassword(value);
    setPasswordError(validatePassword(value));

    // Revalidate confirm password if it already has a value
    if (confirmPassword) {
      if (value !== confirmPassword) {
        setConfirmPasswordError("Passwords did not match");
      } else {
        setConfirmPasswordError("");
      }
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;

    setConfirmPassword(value);

    if (value !== password) {
      setConfirmPasswordError("Passwords did not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  return (
    <>
      <div className="flex h-screen">
        <div className="px-10 py-6 w-137.5 bg-secondary-50 flex flex-col">
          <div className="flex gap-3">
            <Image
              src="/Login&RegistrationIcons/PharmaIcon.svg"
              alt="Login"
              width={28}
              height={28}
            />
            <div className="text-[#6C5CE7] font-bold text-lg">TiaMeds</div>
          </div>

          <div className="mt-2 flex flex-col gap-5">
            <div className="font-semibold text-h4 text-[#1A1F3A]">
              One Platform for <br /> Compliance-Driven <br /> Inventory
              Management
            </div>

            <div className="text-[#4B5563] text-p3 font-normal font-noto-sans">
              Register your healthcare entity and start your journey with
              TiaMeds Inventory.
            </div>

            <div className="flex flex-col font-noto-sans text-p3 font-medium gap-3.5">
              <span className="flex items-center gap-3">
                <Image
                  src="/Login&RegistrationIcons/PharmacyIcon.svg"
                  alt="Login"
                  width={22}
                  height={22}
                />
                Pharmacy
              </span>
              <span className="flex items-center gap-3">
                <Image
                  src="/Login&RegistrationIcons/HospitalIcon.svg"
                  alt="Login"
                  width={22}
                  height={22}
                />
                Hospital
              </span>
              <span className="flex items-center gap-3">
                <Image
                  src="/Login&RegistrationIcons/ClinicIcon.svg"
                  alt="Login"
                  width={22}
                  height={22}
                />
                Clinic
              </span>
              <span className="flex items-center gap-3">
                <Image
                  src="/Login&RegistrationIcons/DoctorIcon.svg"
                  alt="Login"
                  width={22}
                  height={22}
                />
                Doctor
              </span>
              <span className="flex items-center gap-3">
                <Image
                  src="/Login&RegistrationIcons/NursingHomeIcon.svg"
                  alt="Login"
                  width={22}
                  height={22}
                />
                Nursing Home
              </span>
            </div>
          </div>

          <div className="flex-1 flex items-end justify-center">
            <Image
              src="/Login&RegistrationIcons/Hospital.svg"
              alt="Login"
              width={400}
              height={280}
              className="object-contain"
            />
          </div>
        </div>

        <div className="flex-1 px-14 py-14 flex flex-col gap-7 justify-center">
          <div className="flex flex-col gap-2">
            <div className="text-h5 font-semibold">Create Your Account</div>
            <div className="text-p3 font-normal font-noto-sans text-[#4B5563]">
              Enter your details to register your healthcare entity.
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="text-p4 font-semibold text-[#6C5CE7] font-noto-sans">
              User Details
            </div>

            <div className="space-y-2">
              <Input
                label="Email ID"
                placeholder="abc@hospital.in"
                leftIcon={
                  <Image
                    src="/Login&RegistrationIcons/EmailIcon.svg"
                    alt="Email"
                    width={20}
                    height={20}
                  />
                }
                rightIcon={
                  <button className="w-20 h-7 bg-pneutral-900 text-pneutral-50 font-medium text-label-l2 rounded-lg">
                    Send OTP
                  </button>
                }
              />

              <div className="w-full h-8 border-2 border-success-900 rounded-lg bg-success-50 flex items-center gap-2 px-3 text-p4 font-medium text-success-900">
                <Image
                  src="/Login&RegistrationIcons/VerifyIcon.svg"
                  alt="Email"
                  width={17}
                  height={17}
                />
                Email verified successfully{" "}
              </div>
            </div>
            <div className="w-full flex gap-4">
              <div className="flex-1">
                <Input
                  label="Password"
                  placeholder="Enter password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  error={passwordError}
                  leftIcon={
                    <Image
                      src="/Login&RegistrationIcons/PasswordIcon.svg"
                      alt="Password"
                      width={20}
                      height={20}
                    />
                  }
                />
              </div>

              <div className="flex-1">
                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  error={confirmPasswordError}
                  leftIcon={
                    <Image
                      src="/Login&RegistrationIcons/PasswordIcon.svg"
                      alt="Password"
                      width={20}
                      height={20}
                    />
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3 font-noto-sans">
              <input
                id="terms"
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#6C5CE7]"
              />

              <label htmlFor="terms" className="text-p3">
                I agree to the{" "}
                <span className="font-semibold text-secondary-700">
                  Terms & Conditions
                </span>{" "}
                and{" "}
                <span className="font-semibold text-secondary-700">
                  Privacy Policy.
                </span>
              </label>
            </div>

            <Button fullWidth onClick={handleSubmit}>
              Register
            </Button>

            <div className="flex justify-center gap-3 text-p3 font-noto-sans">
              Already have an account?
              <span className="font-semibold text-secondary-700 ">Login</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default page;
