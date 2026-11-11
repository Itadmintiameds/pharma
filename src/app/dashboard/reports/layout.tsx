import PharmacyOnlyReportGate from "./components/PharmacyOnlyReportGate";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <PharmacyOnlyReportGate>{children}</PharmacyOnlyReportGate>;
}
