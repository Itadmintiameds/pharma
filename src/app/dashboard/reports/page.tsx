"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Banknote,
  Box,
  ChartColumn,
  ChevronRight,
  Clock,
  FileChartColumn,
  ReceiptText,
  Scale,
  Search,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import Input from "@/app/components/common/Input";

const CARD_SHADOW =
  "shadow-[4px_4px_12px_0px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_0px_rgba(192,193,190,0.2)]";

const ALL_FORMATS = "Print · PDF · Excel · CSV";

type Category = "sales" | "inventory" | "purchase" | "gst";

type Report = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  formats?: string;
};

type ReportGroup = {
  title: string;
  reports: Report[];
};

type ReportSection = {
  category: Category;
  title: string;
  groups: ReportGroup[];
};

const REPORT_SECTIONS: ReportSection[] = [
  {
    category: "sales",
    title: "Sales",
    groups: [
      {
        title: "Sales",
        reports: [
          {
            title: "Pharma Bill Summary",
            description: "A bill-level summary of pharmacy sales for the selected period.",
            href: "/dashboard/reports/BillSummary",
            icon: FileChartColumn,
          },
          {
            title: "Pharma Bill Detailed Sales Report",
            description: "Product-level details of pharmacy sales.",
            href: "/dashboard/reports/DetailedSaleReport",
            icon: FileChartColumn,
            formats: "Excel · CSV · PDF",
          },
          {
            title: "Doctor-wise / Referred By Pharma Sales Report",
            description: "Product-level sales grouped by the Referred By value.",
            href: "/dashboard/reports/DoctorWiseSaleReport",
            icon: ChartColumn,
            formats: "Excel · CSV · PDF",
          },
          {
            title: "Bill Due Summary – (In-Patient)",
            description: "Pending amounts against In-Patient pharmacy bills.",
            href: "/dashboard/reports/BillDueSummary",
            icon: Clock,
          },
          {
            title: "Inventory Sales Report",
            description: "Product-wise sales and sales returns.",
            href: "/dashboard/reports/inventorySalesReport",
            icon: Box,
          },
          {
            title: "Pharmacy Sales Return Report",
            description: "Completed sales returns with settlement and refund details.",
            href: "/dashboard/reports/pharmacySalesReturnReport",
            icon: ReceiptText,
          },
          {
            title: "Gross Profit / Margin Analysis Report",
            description: "Product-wise profitability from net sales and cost of goods sold.",
            href: "/dashboard/reports/grossProfitReport",
            icon: ChartColumn,
          },
          {
            title: "User-wise Collection Report",
            description: "Payments collected by each user and payment mode.",
            href: "/dashboard/reports/userwiseCollectionReport",
            icon: Banknote,
          },
        ],
      },
      {
        title: "Pharmacy Receipts Report",
        reports: [
          {
            title: "Sales Summary",
            description: "Total sales, discounts, returns, net sales and IP pending.",
            href: "/dashboard/reports/SalesSummary",
            icon: Banknote,
          },
          {
            title: "Payment Mode Summary",
            description: "Payments received, grouped by payment mode.",
            href: "/dashboard/reports/PaymentModeSummary",
            icon: Banknote,
          },
          {
            title: "Receipt Details",
            description: "Payments received against current and previous bills.",
            href: "/dashboard/reports/ReceiptDetails",
            icon: FileChartColumn,
          },
        ],
      },
      {
        title: "Pharmacy Day Closing Summary",
        reports: [
          {
            title: "Bill Count Summary",
            description: "Total, fully paid and pending bills for the day.",
            href: "/dashboard/reports/DayCloseBillCountSummary",
            icon: FileChartColumn,
          },
          {
            title: "Sales Summary",
            description: "Sales, discounts, returns and net sales for the day.",
            href: "/dashboard/reports/DayCloseSalesSummary",
            icon: Banknote,
          },
          {
            title: "Payment Mode Summary",
            description: "Payments collected today, by payment mode.",
            href: "/dashboard/reports/DayClosePaymentModeSummary",
            icon: Banknote,
          },
          {
            title: "Receipt Details",
            description: "Receipts against current and previous bills.",
            href: "/dashboard/reports/DayCloseReceiptDetails",
            icon: FileChartColumn,
          },
          {
            title: "Billing by Patient Type",
            description: "Bill count and amount by patient type.",
            href: "/dashboard/reports/DayCloseBillingByPatientType",
            icon: ChartColumn,
          },
          {
            title: "Billing by User",
            description: "Bill count and total sales by user.",
            href: "/dashboard/reports/DayCloseBillingByUser",
            icon: ChartColumn,
          },
          {
            title: "Receipt by User",
            description: "Receipt count and amount by user.",
            href: "/dashboard/reports/DayCloseReceiptByUser",
            icon: Banknote,
          },
          {
            title: "Current Bill Details",
            description: "Bills generated today with received and pending amounts.",
            href: "/dashboard/reports/DayCloseCurrentBillDetails",
            icon: FileChartColumn,
          },
          {
            title: "Sales Return Details",
            description: "Sales returns processed today.",
            href: "/dashboard/reports/DayCloseSalesReturnDetails",
            icon: ReceiptText,
          },
        ],
      },
    ],
  },
  {
    category: "inventory",
    title: "Inventory",
    groups: [
      {
        title: "Inventory",
        reports: [
          {
            title: "Current Stock Summary Report",
            description: "Product and batch-wise stock as of a selected date.",
            href: "/dashboard/reports/currentStockSummaryReport",
            icon: Box,
          },
          {
            title: "Stock Movement Report",
            description: "Transaction-wise stock in, stock out and balance.",
            href: "/dashboard/reports/stockMovementReport",
            icon: RefreshCw,
          },
          {
            title: "Stock Expiry Report",
            description: "Expired and near-expiry stock by batch and location.",
            href: "/dashboard/reports/stockExpiryReport",
            icon: Clock,
          },
          {
            title: "Stock Damage Report",
            description: "Damaged stock handled through returns and adjustments.",
            href: "/dashboard/reports/stockDamageReport",
            icon: TriangleAlert,
          },
          {
            title: "Stock Return Report",
            description: "Products returned from pharmacies and warehouses.",
            href: "/dashboard/reports/stockReturnReport",
            icon: ReceiptText,
          },
          {
            title: "Stock Adjustment Report",
            description: "Inventory increased or decreased through adjustments.",
            href: "/dashboard/reports/stockAdjustmentReport",
            icon: Scale,
          },
        ],
      },
    ],
  },
  {
    category: "purchase",
    title: "Purchase & Supplier",
    groups: [
      {
        title: "Purchase & Supplier",
        reports: [
          {
            title: "Purchase Register Report",
            description: "Medicines purchased through supplier invoices.",
            href: "/dashboard/reports/purchaseRegisterReport",
            icon: Banknote,
          },
          {
            title: "Supplier Purchase Return Report",
            description: "Products returned to suppliers.",
            href: "/dashboard/reports/supplierPurchaseReturnReport",
            icon: ReceiptText,
          },
          {
            title: "Supplier Outstanding Report",
            description: "Outstanding payables by supplier and invoice.",
            href: "/dashboard/reports/supplierOutstandingReport",
            icon: Scale,
          },
          {
            title: "Supplier Payment Report",
            description: "Payments made to suppliers against credit invoices.",
            href: "/dashboard/reports/supplierPaymentReport",
            icon: Banknote,
          },
          {
            title: "Product-wise Purchase and Sales Analysis Report",
            description: "Purchased vs sold quantities and values by product.",
            href: "/dashboard/reports/productwisePurchaseandSalesAnalysisReport",
            icon: RefreshCw,
          },
        ],
      },
    ],
  },
  {
    category: "gst",
    title: "GST & Finance",
    groups: [
      {
        title: "GST & Finance",
        reports: [
          {
            title: "GST Sales & Purchase Summary Report",
            description: "Sales and purchase ledgers with GST, returns and Net GST by month.",
            href: "/dashboard/reports/GSTSalesAndPurchaseSummaryReport",
            icon: Scale,
          },
        ],
      },
    ],
  },
];

const countReports = (groups: ReportGroup[]) =>
  groups.reduce((sum, g) => sum + g.reports.length, 0);

const TABS: { key: Category | "all"; label: string; count: number }[] = [
  {
    key: "all",
    label: "All reports",
    count: REPORT_SECTIONS.reduce((sum, s) => sum + countReports(s.groups), 0),
  },
  ...REPORT_SECTIONS.map((s) => ({
    key: s.category,
    label: s.title,
    count: countReports(s.groups),
  })),
];

const CountBadge = ({ count }: { count: number }) => (
  <span className="rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
    {count} {count === 1 ? "report" : "reports"}
  </span>
);

const ReportCard = ({ report }: { report: Report }) => {
  const Icon = report.icon;
  return (
    <Link
      href={report.href}
      className={`group flex h-full flex-col gap-sm rounded-2xl bg-white p-md transition-colors hover:ring-1 hover:ring-secondary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-700 ${CARD_SHADOW}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary-100">
          <Icon className="size-6 text-secondary-700" strokeWidth={1.5} />
        </span>
        <ChevronRight
          className="size-6 text-primary-800 transition-transform group-hover:translate-x-0.5"
          strokeWidth={1.5}
        />
      </div>
      <p className="text-label-l4 font-semibold text-pneutral-900">{report.title}</p>
      <p className="text-p3 text-pneutral-500">{report.description}</p>
      <p className="mt-auto text-p2 text-pneutral-500">{report.formats ?? ALL_FORMATS}</p>
    </Link>
  );
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");

  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return REPORT_SECTIONS.filter((s) => activeTab === "all" || s.category === activeTab)
      .map((s) => ({
        ...s,
        groups: s.groups
          .map((g) => ({
            ...g,
            reports: q
              ? g.reports.filter(
                  (r) =>
                    r.title.toLowerCase().includes(q) ||
                    r.description.toLowerCase().includes(q)
                )
              : g.reports,
          }))
          .filter((g) => g.reports.length > 0),
      }))
      .filter((s) => s.groups.length > 0);
  }, [activeTab, query]);

  return (
    <div className="flex w-full flex-col gap-md">
      {/* Page header */}
      <div className="flex w-full items-center gap-md">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-100">
          <ChartColumn className="size-7 text-secondary-700" strokeWidth={1.5} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-xxsm">
          <h1 className="text-h5 font-semibold text-pneutral-900">Reports</h1>
          <p className="text-p3 text-pneutral-500">
            Choose a report to review sales, inventory, purchase and supplier activity for the
            selected reporting period.
          </p>
        </div>
      </div>

      {/* Category tabs + search */}
      <div
        className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md md:flex-row md:items-center ${CARD_SHADOW}`}
      >
        <div
          role="tablist"
          aria-label="Report categories"
          className="flex min-w-0 flex-1 items-start overflow-x-auto"
        >
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className="flex shrink-0 flex-col items-center gap-xsm pt-xsm"
              >
                <span
                  className={`whitespace-nowrap px-sm text-label-l3 font-semibold ${
                    active ? "text-secondary-700" : "text-pneutral-500 hover:text-pneutral-700"
                  }`}
                >
                  {tab.label} ({tab.count})
                </span>
                <span
                  className={`h-1 w-full ${active ? "bg-secondary-700" : "bg-transparent"}`}
                />
              </button>
            );
          })}
        </div>
        <div className="w-full md:w-80 md:shrink-0">
          <Input
            type="search"
            placeholder="Search reports"
            aria-label="Search reports"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-lg!"
            leftIcon={<Search className="size-5 text-pneutral-500" strokeWidth={1.5} />}
          />
        </div>
      </div>

      {/* Report sections */}
      {visibleSections.length === 0 ? (
        <p className="py-hg text-center text-p3 text-pneutral-500">
          No reports match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        visibleSections.map((section) => (
          <section key={section.category} className="flex w-full flex-col gap-md">
            {section.groups.map((group, i) => (
              <div key={group.title} className="flex w-full flex-col gap-md">
                <div className="flex flex-wrap items-center gap-sm">
                  {i === 0 ? (
                    <h2 className="text-label-l5 font-semibold text-pneutral-900">
                      {section.title}
                    </h2>
                  ) : (
                    <h3 className="text-label-l4 font-semibold text-pneutral-900">
                      {group.title}
                    </h3>
                  )}
                  <CountBadge
                    count={i === 0 ? countReports(section.groups) : group.reports.length}
                  />
                </div>
                <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
                  {group.reports.map((report) => (
                    <ReportCard key={report.href} report={report} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
