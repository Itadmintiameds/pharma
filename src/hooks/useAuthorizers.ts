"use client";

import { useEffect, useMemo, useState } from "react";
import type { DropdownOption } from "@/app/components/common/Dropdown";
import { getAllUsers, getUserNames } from "@/services/UserManagementService";
import type { UserData } from "@/types/UserData";
import { normalizeRole, useCurrentUser } from "@/hooks/useCurrentUser";
import { usePharmacyStore } from "@/store/pharmacyStore";

/**
 * Who may authorize an exception (a bill discount, a late sales return), by the
 * logged-in user's role: a desk user needs an Admin or Super Admin, an Admin
 * needs a Super Admin.
 */
const AUTHORIZER_ROLES: Record<string, string[]> = {
  deskrole: ["admin", "superadmin"],
  admin: ["superadmin"],
  superadmin: ["superadmin"],
};

const roleOf = (u: UserData) => u.roleName ?? u.pharmaRolesDto?.roleName ?? "";

/**
 * The people who can authorize for the current user at the selected pharmacy,
 * as dropdown options labelled "Name (Role)" — Super Admins first, then Admins,
 * alphabetical within each.
 */
export function useAuthorizers(): {
  options: DropdownOption[];
  loading: boolean;
  /** Full name (no role) of the user with this id, or "". */
  nameOf: (userId: string) => string;
} {
  const [orgUsers, setOrgUsers] = useState<UserData[]>([]);
  // userIds working at the selected pharmacy. /user/all carries roles but not
  // pharmacy ids, /user/names the reverse — so the two are joined.
  const [pharmacyUserIds, setPharmacyUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { role: currentRole } = useCurrentUser();
  const pharmacyId = usePharmacyStore(
    (state) => state.selectedPharmacy?.pharmacyId ?? ""
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      getAllUsers(),
      getUserNames(pharmacyId ? [pharmacyId] : []).catch((err) => {
        console.error("Failed to load pharmacy users:", err);
        return [];
      }),
    ])
      .then(([data, names]) => {
        if (!active) return;
        setOrgUsers((data as UserData[] | null) ?? []);
        setPharmacyUserIds(new Set(names.map((n) => String(n.userId))));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pharmacyId]);

  const options = useMemo(() => {
    const allowed = AUTHORIZER_ROLES[currentRole] ?? [];
    return (
      orgUsers
        .filter((u) => {
          const role = normalizeRole(roleOf(u));
          if (!allowed.includes(role)) return false;
          // Super Admins cover the whole organization; Admins must be mapped
          // to this pharmacy.
          if (role === "superadmin" || !pharmacyId) return true;
          return (
            pharmacyUserIds.has(String(u.userId)) ||
            (u.pharmacies ?? []).some((p) => p.pharmacyId === pharmacyId)
          );
        })
        .map((u) => ({
          rank: normalizeRole(roleOf(u)) === "superadmin" ? 0 : 1,
          label: `${u.fullName} (${roleOf(u)})`,
          value: String(u.userId),
        }))
        .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
        .map(({ label, value }) => ({ label, value }))
    );
  }, [orgUsers, pharmacyUserIds, currentRole, pharmacyId]);

  const nameOf = (userId: string) =>
    (orgUsers.find((u) => String(u.userId) === userId)?.fullName ?? "").trim();

  return { options, loading, nameOf };
}
