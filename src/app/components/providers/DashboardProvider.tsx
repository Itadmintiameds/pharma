"use client";

import { ReactNode } from "react";

import useInitializePharmacy from "@/hooks/useInitializePharmacy";

export default function DashboardProvider({
  children,
}: {
  children: ReactNode;
}) {
  useInitializePharmacy();

  return <>{children}</>;
}
