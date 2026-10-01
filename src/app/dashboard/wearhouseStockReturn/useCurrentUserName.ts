"use client";

import { useEffect, useState } from "react";
import { getById } from "@/services/UserManagementService";

/** The signed-in user's full name, looked up the same way the Navbar does. */
export const useCurrentUserName = (fallback = "—"): string => {
  const [name, setName] = useState(fallback);

  useEffect(() => {
    let active = true;

    fetch("/api/user-info")
      .then((res) => (res.ok ? res.json() : null))
      .then((info) => (info?.userId ? getById(info.userId) : null))
      .then((user) => {
        if (active && user?.fullName) setName(user.fullName);
      })
      .catch((err) => console.error("Failed to fetch the current user:", err));

    return () => {
      active = false;
    };
  }, []);

  return name;
};
