import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import {
  BillCountResponse,
  BillDueResponse,
  BillingByPatientTypeResponse,
  BillSummaryResponse,
  DetailedSaleResponse,
  DoctorWiseResponse,
  FinancialReportParams,
  PaymentModeResponse,
  ReceiptDetailsResponse,
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
