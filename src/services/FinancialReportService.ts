import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import { BillSummaryResponse, FinancialReportParams } from '@/types/FinancialReportData';

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
