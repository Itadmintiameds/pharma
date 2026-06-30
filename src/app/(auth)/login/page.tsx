"use client";

import React, { useState } from "react";
import Image from "next/image";
import Input from "@/app/components/common/Input";
import Button from "@/app/components/common/Button";

const page = () => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <>
      <div className="flex h-screen">
        <div className="p-14 w-136.75 bg-secondary-50 flex flex-col gap-14">
          <div className="flex gap-3">
            <Image
              src="/Login&RegistrationIcons/PharmaIcon.svg"
              alt="Login"
              width={28}
              height={28}
            />
            <div className="text-[#6C5CE7] font-bold text-lg">TiaMeds</div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="text-h4 font-semibold">Welcome Back!</div>
            <div className="text-[#4B5563] text-p3 font-normal font-noto-sans">
              Login to access your inventory dashboard and <br /> manage your
              business efficiently.
            </div>
          </div>

          <div className="flex justify-center">
            <Image
              src="/Login&RegistrationIcons/LoginDoctorIcon.svg"
              alt="Login"
              width={355}
              height={355}
            />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-14">
          <div className="w-97.75 h-[489px] border-2 border-pneutral-200 rounded-[14px] flex flex-col p-10 gap-9">
            <div className="text-h5 font-semibold ">Login to Your Account</div>

            <div className="flex flex-col gap-5">
              <Input
                label="User Name"
                placeholder="abchospital_admin"
                leftIcon={
                  <Image
                    src="/Login&RegistrationIcons/UsernameIcon.svg"
                    alt="Password"
                    width={20}
                    height={20}
                  />
                }
              />
              <div>
                <Input
                  label="Password"
                  leftIcon={
                    <Image
                      src="/Login&RegistrationIcons/LockIcon.svg"
                      alt="Password"
                      width={20}
                      height={20}
                    />
                  }
                  rightIcon={
                    <Image
                      src="/Login&RegistrationIcons/PasswordIcon.svg"
                      alt="Password"
                      width={20}
                      height={20}
                    />
                  }
                />
                <span className="text-p2 font-semibold font-noto-sans text-secondary-700 flex justify-end mt-1">
                  Forgot Password?
                </span>
              </div>
              <div className="flex items-center gap-3 font-noto-sans">
                <input
                  id="terms"
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#6C5CE7]"
                />
                <span className="font-normal text-[#4B5563] text-p2">
                  Remember Me
                </span>
              </div>

                <Button size="lg">Login</Button>

                <div className="flex font-noto-sans text-p3 font-normal gap-3 justify-center">
                  <span className="text-pneutral-900">Don't have an account?</span>
                  <span className="text-secondary-700">Register</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default page;
