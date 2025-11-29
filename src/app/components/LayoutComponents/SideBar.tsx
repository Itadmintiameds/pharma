"use client";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import clsx from "clsx";
import {

  ChevronRightIcon,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { navigation } from "./Navigation";
import Image from "next/image";
import { MdKeyboardArrowRight, MdKeyboardArrowLeft } from "react-icons/md";
import { toast } from "react-toastify";
import useUserStore from "@/app/context/userStore";
import { FiLogOut } from "react-icons/fi";

interface SideBarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const SideBar = ({ isOpen, setIsOpen }: SideBarProps) => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const { user, initializeUser } = useUserStore();

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  return (
    <aside
      className={`sidebar fixed inset-y-0 left-0 m-1 py-8 px-1 rounded-lg bg-primaryPurple text-gray shadow-lg transform transition-transform duration-300 ease-in-out overflow:auto ${
        isOpen ? "w-60" : "w-20"
      }`}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between p-4 relative ">
            {isOpen ? (
              <span className="text-lg font-semibold flex space-x-3">
                <Image
                  src="/TiamedsIcon.svg"
                  alt="Company Logo"
                  width={45}
                  height={32}
                />
                <Image
                  src="/TiamedsLogo.svg"
                  alt="Company Logo"
                  width={90}
                  height={32}
                />
              </span>
            ) : (
              <Image
                src="/TiamedsIcon.svg"
                alt="Company Logo"
                width={45}
                height={32}
              />
            )}

            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/1 bg-hoverPurple w-6 h-6 rounded-md text-darkPurple flex items-center justify-center cursor-pointer transition-colors duration-200"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {isOpen ? (
                <MdKeyboardArrowLeft size={18} />
              ) : (
                <MdKeyboardArrowRight size={18} />
              )}
            </div>
          </div>
          <nav className="mt-4 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  {!item.children ? (
                    <Link
                      href={item.href ?? "#"}
                      onClick={() => setSelectedItem(item.name)}
                      className={clsx(
                        selectedItem === item.name
                          ? "bg-purple-400 text-white"
                          : "hover:bg-purple-200",
                        "flex items-center gap-x-4 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200"
                      )}
                    >
                      {item.icon && (
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                      )}
                      {isOpen && <span>{item.name}</span>}
                    </Link>
                  ) : (
                    <Disclosure as="div">
                      {({ open }) => (
                        <>
                          <DisclosureButton
                            onClick={() => setSelectedItem(item.name)}
                            className={clsx(
                              selectedItem === item.name
                                ? "bg-purple-400 text-white"
                                : "hover:bg-purple-200",
                              "flex items-center gap-x-4 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 cursor-pointer w-full"
                            )}
                          >
                            {item.icon && (
                              <item.icon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            )}
                            {isOpen && <span>{item.name}</span>}
                            {isOpen && (
                              <ChevronRightIcon
                                className={clsx(
                                  "ml-auto h-4 w-4 transition-transform duration-200",
                                  { "rotate-90": open }
                                )}
                              />
                            )}
                          </DisclosureButton>
                          {isOpen && open && (
                            <DisclosurePanel
                              as="ul"
                              className="mt-1 ml-6 space-y-1"
                            >
                              {item.children?.map((subItem) => (
                                <li key={subItem.name}>
                                  <Link
                                    href={subItem.href ?? "#"}
                                    onClick={() =>
                                      setSelectedItem(subItem.name)
                                    }
                                    className={clsx(
                                      selectedItem === subItem.name
                                        ? "bg-purple-400 text-white"
                                        : "hover:bg-purple-200",
                                      "flex items-center gap-x-3 px-2 py-1 text-sm font-medium rounded-md transition-colors duration-200"
                                    )}
                                  >
                                    {subItem.icon && (
                                      <subItem.icon
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                      />
                                    )}
                                    <span>{subItem.name}</span>
                                  </Link>
                                </li>
                              ))}
                            </DisclosurePanel>
                          )}
                        </>
                      )}
                    </Disclosure>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <ul
          className={clsx(
            "mb-4 items-center",
            isOpen ? "flex gap-4" : "flex justify-center"
          )}
        >
          {isOpen ? (
            <>
              <Image src="/UserImg.svg" alt="User" width={30} height={30} />
              <li className="text-sm font-medium">
                {`${user?.firstName || ""} ${user?.lastName || ""}`}
              </li>
            </>
          ) : null}

          <li>
            <button
              className="relative flex items-center justify-center w-10 h-10"
              onClick={() => {
                toast.success("Logged out successfully", {
                  position: "top-right",
                  autoClose: 2000,
                });
                localStorage.removeItem("user");
                document.cookie =
                  "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                window.location.href = "/login";
              }}
            >
              <FiLogOut className="h-5 w-5 cursor-pointer" aria-hidden="true" />
              <span className="absolute left-1/2 transform -translate-x-1/2 -translate-y-full bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Logout
              </span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default SideBar;