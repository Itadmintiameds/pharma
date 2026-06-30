"use client";

import Input from "@/app/components/common/Input";
import React, { useState } from "react";
import Image from "next/image";
import Button from "@/app/components/common/Button";

const page = () => {
  const [isChecked, setIsChecked] = useState(false);

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

        <div className="flex-1 px-14 py-8 flex flex-col gap-7">
          <div className="flex flex-col gap-2">
            <div className="text-h5 font-semibold">Create Your Account</div>
            <div className="text-p3 font-normal font-noto-sans text-[#4B5563]">
              Enter your details to register your healthcare entity.
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="text-p4 font-semibold text-[#6C5CE7] font-noto-sans">
              Healthcare Entity Details
            </div>

            <div className="w-full flex gap-4">
              <div className="flex-1">
                <Input
                  label="Healthcare Entity Name"
                  placeholder="ABC Hospital"
                />
              </div>

              <div className="flex-1">
                <Input
                  label="Healthcare Entity Type"
                  placeholder="Select Entity Type"
                />
              </div>
            </div>

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
            />
            <div className="text-p4 font-semibold text-[#6C5CE7] font-noto-sans">
              Super Admin Details
            </div>

            <Input label="User Name" placeholder="abchospital_admin" />

            <div className="w-full flex gap-4">
              <div className="flex-1">
                <Input
                  label="Password"
                  placeholder="Enter password"
                  type="password"
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

            <Button fullWidth>Register</Button>

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
