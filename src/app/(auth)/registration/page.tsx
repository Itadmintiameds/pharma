"use client";

import Input from "@/app/components/common/Input";
import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/app/components/common/Button";
import { register, sendEmailOtp, verifyEmailOtp } from "@/services/AuthService";
import { useRouter } from "next/navigation";
import { showToast } from "@/app/components/common/Toast";

const page = () => {
  const router = useRouter();

  const [isChecked, setIsChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [showOtp, setShowOtp] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [termsError, setTermsError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);

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

  const handleChange = async (value: string, index: number) => {
    // Only allow numeric input
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input field
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto verify OTP when all 6 digits are entered
    const updatedOtp = [...newOtp];

    if (updatedOtp.every((digit) => digit !== "")) {
      try {
        const response = await verifyEmailOtp({
          email: userEmail,
          otp: updatedOtp.join(""),
        });

        setIsEmailVerified(true);
        setShowOtp(false);

        // Optional: Clear OTP after successful verification
        setOtp(["", "", "", "", "", ""]);
      } catch (error) {
        if (error instanceof Error) {
          showToast.error(error.message);
          
          // Clear OTP on failure
          setOtp(["", "", "", "", "", ""]);

          // Focus first box again
          inputRefs.current[0]?.focus();
        }
      }
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    // Move to previous field on backspace if current field is empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    let hasError = false;
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setTermsError("");

    // Email validation
    if (!userEmail.trim()) {
      setEmailError("Email ID is required.");
      hasError = true;
    } else if (!isEmailVerified) {
      setEmailError("Please verify your Email ID.");
      hasError = true;
    }

    // Password validation
    if (!password.trim()) {
      setPasswordError("Password is required.");
      hasError = true;
    } else {
      const passwordValidation = validatePassword(password);
      if (passwordValidation) {
        setPasswordError(passwordValidation);
        hasError = true;
      }
    }

    // Confirm password validation
    if (!confirmPassword.trim()) {
      setConfirmPasswordError("Confirm Password is required.");
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords did not match.");
      hasError = true;
    }

    // Terms validation
    if (!isChecked) {
      setTermsError("Please accept the Terms & Conditions and Privacy Policy.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      const payload = {
        userEmail,
        password,
      };

      const response = await register(payload);

      showToast.success("Registration Successful");

      router.push("/login");
    } catch (error) {
      if (error instanceof Error) {
        setEmailError(error.message);
        showToast.error("Invalid Credentials");
      }
    }
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

  const handleSendOtp = async () => {
    if (!userEmail.trim()) {
      setEmailError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(userEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setEmailError("");
    setIsSendingOtp(true);

    try {
      await sendEmailOtp({
        email: userEmail,
      });

      showToast.success("OTP Sent");
      setShowOtp(true);
    } catch (error) {
      if (error instanceof Error) {
        showToast.error(error.message);
      }
    } finally {
      setIsSendingOtp(false);
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
              style={{ height: 'auto' }}
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
                value={userEmail}
                maxLength={100}
                onChange={(e) => {
                  setUserEmail(e.target.value);

                  if (emailError) {
                    setEmailError("");
                  }
                }}
                error={emailError}
                leftIcon={
                  <Image
                    src="/Login&RegistrationIcons/EmailIcon.svg"
                    alt="Email"
                    width={20}
                    height={20}
                  />
                }
                rightIcon={
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isEmailVerified || isSendingOtp}
                    className={`w-24 h-7 rounded-lg font-medium text-label-l2 flex items-center justify-center ${
                      isEmailVerified
                        ? "border border-success-900 bg-success-50 text-success-900 cursor-not-allowed"
                        : isSendingOtp
                          ? "bg-pneutral-500 text-pneutral-50 cursor-wait"
                          : "bg-pneutral-900 text-pneutral-50 hover:bg-pneutral-800"
                    }`}
                  >
                    {isEmailVerified
                      ? "Verified"
                      : isSendingOtp
                        ? "Sending..."
                        : "Send OTP"}
                  </button>
                  // <button
                  //   type="button"
                  //   onClick={handleSendOtp}
                  //   disabled={isEmailVerified || isSendingOtp}
                  //   className={`w-20 h-7 rounded-lg font-medium text-label-l2 ${
                  //     isEmailVerified
                  //       ? "border border-success-900 rounded-xl bg-success-50 text-success-900 cursor-not-allowed"
                  //       : "bg-pneutral-900 text-pneutral-50"
                  //   }`}
                  // >
                  //   {isEmailVerified ? "Verified" : "Send OTP"}
                  // </button>
                }
              />
              {isEmailVerified && (
                <div className="w-full h-8 border-2 border-success-900 rounded-lg bg-success-50 flex items-center gap-2 px-3 text-p4 font-medium text-success-900">
                  <Image
                    src="/Login&RegistrationIcons/VerifyIcon.svg"
                    alt="Email"
                    width={17}
                    height={17}
                  />
                  Email verified successfully{" "}
                </div>
              )}
            </div>

            {showOtp && (
              <div className="flex flex-col gap-2.5 h-[78px] w-[348px]">
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
            )}

            <div className="w-full flex gap-4">
              <div className="flex-1">
                <Input
                  label="Password"
                  placeholder="Enter password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  error={passwordError}
                  leftIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="flex items-center cursor-pointer"
                    >
                      <Image
                        src="/Login&RegistrationIcons/PasswordIcon.svg"
                        alt={showPassword ? "Hide Password" : "Show Password"}
                        width={20}
                        height={20}
                      />
                    </button>
                  }
                />
              </div>

              <div className="flex-1">
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  error={confirmPasswordError}
                  leftIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="flex items-center cursor-pointer"
                    >
                      <Image
                        src="/Login&RegistrationIcons/PasswordIcon.svg"
                        alt={
                          showConfirmPassword
                            ? "Hide Password"
                            : "Show Password"
                        }
                        width={20}
                        height={20}
                      />
                    </button>
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-start gap-3 font-noto-sans">
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

              {termsError && (
                <p className="ml-7 text-p2 text-warning-500">{termsError}</p>
              )}
            </div>

            <Button fullWidth onClick={handleSubmit}>
              Register
            </Button>

            <div className="flex justify-center gap-3 text-p3 font-noto-sans">
              <span>Already have an account?</span>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="font-semibold text-secondary-700 hover:underline cursor-pointer"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default page;
