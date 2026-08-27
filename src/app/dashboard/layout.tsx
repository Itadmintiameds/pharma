import React from "react";
import { cookies } from "next/headers";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import DashboardProvider from "../components/providers/DashboardProvider";
import AccessProvider from "../components/providers/AccessProvider";
import PharmacyScope from "../components/providers/PharmacyScope";
import ModuleGuard from "../components/providers/ModuleGuard";
import BusinessSetupGuard from "../components/providers/BusinessSetupGuard";
import {
  decodeJwtPayload,
  hasPermissionsClaim,
  readTokenPermissions,
} from "@/utils/jwt";

/**
 * The role and permissions ride in the JWT, so they are read here rather than
 * fetched: this is a server component, so the first paint already knows what the
 * user may do and no forbidden module ever flashes on screen.
 */
export default async function layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("access_token")?.value ?? cookieStore.get("token")?.value;
  const payload = decodeJwtPayload(token);

  const session = {
    userId: payload?.userId ?? payload?.userID ?? payload?.sub ?? null,
    roleName: payload?.role ?? null,
    permissions: readTokenPermissions(payload),
    permissionsDescribed: hasPermissionsClaim(payload),
  };

  return (
    <AccessProvider session={session}>
    <DashboardProvider>
      <div className="flex h-screen flex-col">
        <Navbar />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar />

          <main className="flex-1 overflow-y-auto p-6 bg-secondary-50">
            <BusinessSetupGuard>
              <ModuleGuard>
                <PharmacyScope>{children}</PharmacyScope>
              </ModuleGuard>
            </BusinessSetupGuard>
          </main>
        </div>
      </div>
    </DashboardProvider>
    </AccessProvider>
  );
}

