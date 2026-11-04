// Types for GET /auditReports/gross-profit (GrossProfitReportController in pharma-backend).

import type { CustomerType } from "@/types/BillingData";

/**
 * Query filters for the Gross Profit / Margin Analysis Report (GrossProfitReportFilter).
 * Every list is a multi-select and every search a case-insensitive "contains";
 * leave it out or empty for "no restriction".
 */
export interface GrossProfitReportFilter {
  // Sale / return date period as YYYY-MM-DD, both inclusive. Today / Specific
  // Day / By Month / By Date Range all resolve to this pair on the client.
  // Missing fromDate = today; missing toDate = fromDate.
  fromDate?: string;
  toDate?: string;
  // Empty = every pharmacy the logged-in user can access.
  pharmacyIds?: string[];
  // Product Name: pick products by id, and/or free-text search.
  productIds?: string[];
  productName?: string;
  batchNumber?: string;
  // Pharmacy bill reference. Returns are matched on their original bill.
  billNo?: string;
  // Completed sales return reference, e.g. SLR-2026-00001. Narrows the
  // report to the bills that return was made against.
  salesReturnNo?: string;
  // Customer/Patient Type: WALK_IN, OP_PATIENT, IP_PATIENT, DAYCARE.
  customerTypes?: CustomerType[];
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Backend default grossProfit.
  sortBy?: GrossProfitReportSortBy;
  // Backend default desc.
  sortDir?: "asc" | "desc";
}

export type GrossProfitReportSortBy =
  | "pharmacyName"
  | "productName"
  | "batchNumber"
  | "soldQuantity"
  | "returnQuantity"
  | "netQuantity"
  | "netSalesAmount"
  | "netCost"
  | "grossProfit"
  | "marginPercentage";

/** One product + batch line of the Product Profitability table (GrossProfitReportRowDto). */
export interface GrossProfitReportRow {
  pharmacyName: string;
  productId: string;
  productName: string;
  batchNumber: string;
  // Smallest units, the same unit as bill_quantity.
  soldQuantity: number;
  returnQuantity: number;
  netQuantity: number;
  // Taxable value (after discount, before GST) of sales less returns.
  netSalesAmount: number;
  // netQuantity at the batch's purchase price per unit.
  netCost: number;
  // netSalesAmount - netCost.
  grossProfit: number;
  // grossProfit / netSalesAmount, 0-100.
  marginPercentage: number;
}

/** One page of the Product Profitability table (GrossProfitReportPageDto). */
export interface GrossProfitReportPage {
  data: GrossProfitReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/**
 * KPI cards and the table's Total row, over every line matching the filters,
 * not just the current page (GrossProfitReportSummaryDto).
 */
export interface GrossProfitReportSummary {
  totalSoldQuantity: number;
  totalReturnQuantity: number;
  // "1,065 units net sold".
  totalNetQuantity: number;
  netSalesAmount: number;
  netCostOfGoodsSold: number;
  // Share of netSalesAmount, 0-100: "77% of net sales".
  costPercentage: number;
  grossProfit: number;
  // Consolidated grossProfit / netSalesAmount, 0-100.
  grossMargin: number;
  // Distinct products, profit summed over their batches: "4 products all profitable".
  totalProducts: number;
  profitableProducts: number;
  lossMakingProducts: number;
}

/** GET /auditReports/gross-profit (GrossProfitReportResponse). */
export interface GrossProfitReportResponse {
  summary: GrossProfitReportSummary;
  productProfitability: GrossProfitReportPage;
  // Report header, already formatted by the backend, e.g. "01-Oct-2026".
  fromDate: string;
  toDate: string;
  generatedBy: string;
  // Already formatted by the backend, e.g. "12-Oct-2026 05:30 PM".
  generatedOn: string;
}
