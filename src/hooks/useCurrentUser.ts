"use client";

import { useEffect, useState } from "react";
import { UserData } from "@/types/UserData";

/** Same normalization Sidebar.tsx / useOrgInventoryGuard.ts already apply to role names. */
export const normalizeRole = (role?: string) =>
  (role || "").toLowerCase().replace(/[^a-z]/g, "");

// The Desk role is stored in the DB as "DESKROLE" (one word, no space) —
// unlike "Super Admin"/"Warehouse Manager", so it normalizes to "deskrole"
// rather than "desk".
export type NormalizedRole =
  | "superadmin"
  | "admin"
  | "deskrole"
  | "warehousemanager"
  | "";

/**
 * The logged-in user, fetched once and normalized. Centralizes the
 * fetch('/api/user-info') -> getUserById(userId) lookup duplicated across
 * Sidebar.tsx, Navbar.tsx and useOrgInventoryGuard.ts, so new screens (like a
 * role-aware dashboard) have one place to read "who is this and what role are
 * they" from.
 */
export function useCurrentUser(): {
  user: UserData | null;
  role: NormalizedRole;
  loading: boolean;
} {
  const [user, setUser] = useState<UserData | null>(null);
  const [role, setRole] = useState<NormalizedRole>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const userRes = await fetch("/api/user-info");
        if (!userRes.ok) return;
        const { userId } = await userRes.json();
        if (!userId) return;

        const { getUserById } = await import("@/services/UserManagementService");
        const userDetails = await getUserById(userId).catch(() => null);
        if (cancelled || !userDetails) return;

        setUser(userDetails);
        setRole(normalizeRole(userDetails?.pharmaRolesDto?.roleName) as NormalizedRole);
      } catch (err) {
        console.error("Failed to load current user:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, role, loading };
}
