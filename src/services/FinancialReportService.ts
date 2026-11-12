import axios from 'axios';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import {
  BillCountResponse,
  BillDueResponse,
  BillingByPatientTypeResponse,
  BillingByUserResponse,
  BillSummaryResponse,
  CurrentBillDetailsResponse,
  DetailedSaleResponse,
  DoctorWiseResponse,
  FinancialReportParams,
  GstRegistration,
  GstSalesPurchaseSummaryResponse,
  PaymentModeResponse,
  ReceiptByUserResponse,
  ReceiptDetailsResponse,
  ReportExportFormat,
  ReportExportKey,
  SalesReturnDetailsResponse,
  SalesSummaryResponse,
} from '@/types/FinancialReportData';

/**
 * Drops blank strings and empty lists, so the request carries only the filters
 * actually set — the backend treats a present-but-empty value as a filter.
 */
const toQuery = (params: FinancialReportParams) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) =>
      Array.isArray(value)
        ? value.length > 0
        : value !== undefined && value !== null && value !== ''
    )
  );

/**
 * Lists go out as repeated keys (pharmacyIds=A&pharmacyIds=B), which is what the
 * backend binds to a List — axios's default would send pharmacyIds[]=A.
 */
const getReport = (url: string, params: FinancialReportParams) =>
  api.get(url, { params: toQuery(params), paramsSerializer: { indexes: null } });

// Bill-wise sales for the period, with KPI totals over all matching bills.
export const getBillSummary = async (
  params: FinancialReportParams
): Promise<BillSummaryResponse> => {
  try {
    const response = await getReport('/financial-report/bill-summary', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the bill summary report.');
  }
};

// One row per product line on each bill, with KPI totals over all matching lines.
export const getDetailedSaleReport = async (
  params: FinancialReportParams
): Promise<DetailedSaleResponse> => {
  try {
    const response = await getReport('/financial-report/detailed-sale-report', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the detailed sale report.');
  }
};

// One row per pharmacy + doctor + product; only bills with a referring doctor.
export const getDoctorWiseSalesReport = async (
  params: FinancialReportParams
): Promise<DoctorWiseResponse> => {
  try {
    const response = await getReport('/financial-report/doctor-wise-sales-report', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the doctor-wise sales report.');
  }
};

// Amount received and pending on IP bills; pendingStatus picks PENDING, FULLY_PAID or ALL.
export const getBillDueSummary = async (
  params: FinancialReportParams
): Promise<BillDueResponse> => {
  try {
    const response = await getReport('/financial-report/bill-due-summary', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the bill due summary report.');
  }
};

// Cumulative sales, discount, returns, net sales and IP pending for the period.
export const getSalesSummary = async (
  params: FinancialReportParams
): Promise<SalesSummaryResponse> => {
  try {
    const response = await getReport('/financial-report/sales-summary', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the sales summary report.');
  }
};

// Payments received in the period, per payment mode, with a closing TOTAL row.
export const getPaymentModeSummary = async (
  params: FinancialReportParams
): Promise<PaymentModeResponse> => {
  try {
    const response = await getReport('/financial-report/payment-mode-summary', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the payment mode summary report.');
  }
};

// Receipts in the period against current vs previous bills; the period is required.
export const getReceiptDetails = async (
  params: FinancialReportParams
): Promise<ReceiptDetailsResponse> => {
  try {
    const response = await getReport('/financial-report/receipt-details', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the receipt details report.');
  }
};

// Day Close: total, fully paid and pending IP bill counts for one day.
export const getBillCountSummary = async (
  params: FinancialReportParams
): Promise<BillCountResponse> => {
  try {
    const response = await getReport('/financial-report/bill-count-summary', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the bill count summary report.');
  }
};

// Day Close: bill count and amount per patient type, with a closing TOTAL row.
export const getBillingByPatientType = async (
  params: FinancialReportParams
): Promise<BillingByPatientTypeResponse> => {
  try {
    const response = await getReport('/financial-report/billing-by-patient-type', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the billing by patient type report.');
  }
};

// Day Close: bill count and sales per user and pharmacy, with a closing TOTAL row.
export const getBillingByUser = async (
  params: FinancialReportParams
): Promise<BillingByUserResponse> => {
  try {
    const response = await getReport('/financial-report/billing-by-user', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the billing by user report.');
  }
};

// Day Close: receipt count and amount collected per user and pharmacy, with a closing TOTAL row.
export const getReceiptByUser = async (
  params: FinancialReportParams
): Promise<ReceiptByUserResponse> => {
  try {
    const response = await getReport('/financial-report/receipt-by-user', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the receipt by user report.');
  }
};

// Day Close: bills raised on the day with amount received and IP pending (paged).
export const getCurrentBillDetails = async (
  params: FinancialReportParams
): Promise<CurrentBillDetailsResponse> => {
  try {
    const response = await getReport('/financial-report/current-bill-details', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the current bill details report.');
  }
};

// Day Close: completed sales returns made on the day (paged).
export const getSalesReturnDetails = async (
  params: FinancialReportParams
): Promise<SalesReturnDetailsResponse> => {
  try {
    const response = await getReport('/financial-report/sales-return-details', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the sales return details report.');
  }
};

// GST Sales & Purchase Summary: both ledgers and the monthly Net GST (not paged).
export const getGstSalesPurchaseSummary = async (
  params: FinancialReportParams
): Promise<GstSalesPurchaseSummaryResponse> => {
  try {
    const response = await getReport('/financial-report/gst-sales-purchase-summary', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the GST sales & purchase summary.');
  }
};

// The GSTINs of the given pharmacies / warehouses, for the GSTIN filter.
export const getGstRegistrations = async (
  params: Pick<FinancialReportParams, 'pharmacyIds' | 'warehouseIds'>
): Promise<GstRegistration[]> => {
  try {
    const response = await getReport('/financial-report/gst-sales-purchase-summary/gstins', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the GSTINs.');
  }
};

/** A referring doctor and the pharmacy it belongs to, for the Referred By filter. */
export interface PharmacyDoctor {
  doctorId: number;
  doctorName: string;
  pharmacyId: string;
  pharmacyName: string;
}

// The referring doctors of the given pharmacies.
export const getDoctorsByPharmacies = async (
  pharmacyIds: string[]
): Promise<PharmacyDoctor[]> => {
  try {
    const response = await getReport('/financial-report/get-all-doctors-by-pharmacies', { pharmacyIds });
    return response.data ?? [];
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the doctors.');
  }
};

/** The server's file name from Content-Disposition, e.g. bill-summary_2026-11-03.xlsx. */
const fileNameFrom = (disposition: string | undefined, fallback: string) => {
  const match = disposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const name = match?.[1] ?? match?.[2];
  return name ? decodeURIComponent(name) : fallback;
};

/**
 * CSV / Excel download of any financial report with the same filters as the
 * screen — every matching row, not just the page.
 */
export const downloadReportExport = (
  report: ReportExportKey,
  format: ReportExportFormat,
  params: FinancialReportParams
): Promise<void> =>
  downloadReportFile(
    '/financial-report/export',
    toQuery({ ...params, page: undefined, size: undefined, unpaged: undefined, report, format } as FinancialReportParams),
    `${report}.${format}`
  );

/**
 * GETs a report file (CSV / Excel) and hands it to the browser to save, under
 * the server's file name. Lists in `params` go out as repeated keys.
 */
export const downloadReportFile = async (
  endpoint: string,
  params: Record<string, unknown> | URLSearchParams,
  fallbackName: string
): Promise<void> => {
  try {
    const response = await api.get<Blob>(endpoint, {
      params,
      paramsSerializer: { indexes: null },
      responseType: 'blob',
    });

    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileNameFrom(response.headers['content-disposition'], fallbackName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    // The click has handed the blob to the download by now.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    // With responseType blob the error body is a Blob too; read it back to
    // text/JSON so the backend's message ("Too many rows…") reaches the toast.
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const text = await error.response.data.text();
      try {
        error.response.data = JSON.parse(text);
      } catch {
        error.response.data = text;
      }
    }
    throw handleApiError(error, 'Failed to download the report.');
  }
};
