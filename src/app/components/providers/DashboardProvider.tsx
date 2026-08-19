"use client";

import { ReactNode } from "react";

import useInitializePharmacy from "@/hooks/useInitializePharmacy";
import useInitializeWarehouse from "@/hooks/useInitializeWarehouse";

export default function DashboardProvider({
  children,
}: {
  children: ReactNode;
}) {
  useInitializePharmacy();
  useInitializeWarehouse();

  return <>{children}</>;
}
