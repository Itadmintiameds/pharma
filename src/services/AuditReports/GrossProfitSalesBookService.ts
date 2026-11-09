import { downloadReportFile } from '@/services/FinancialReportService';
import {
  GrossProfitSalesBookFilter,
  GrossProfitSalesBookResponse,
} from '@/types/AuditReports/GrossProfitSalesBookData';
import type { ReportExportFormat } from '@/types/FinancialReportData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?pharmacyIds=A&pharmacyIds=B), which Spring binds
// to List<...>. Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: GrossProfitSalesBookFilter): URLSearchParams => {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else {
      params.append(key, String(value));
    }
  });
  return params;
};

// Gross Profit (GP) on Consolidated Sales Book: bill amount, cost, gross profit
// and G.P. % per date, with KPI totals and one page of the table.
export const getGrossProfitSalesBook = async (
  filter: GrossProfitSalesBookFilter
): Promise<GrossProfitSalesBookResponse> => {
  try {
    const response = await api.get('/auditReports/gross-profit-sales-book', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the G.P. on consolidated sales book.');
  }
};

// CSV / Excel download with the same filters as the screen: every matching row.
export const downloadGrossProfitSalesBookExport = (
  format: ReportExportFormat,
  filter: GrossProfitSalesBookFilter
): Promise<void> => {
  const params = toSearchParams({ ...filter, page: undefined, size: undefined, unpaged: undefined });
  params.append('format', format);
  return downloadReportFile(
    '/auditReports/gross-profit-sales-book/export',
    params,
    `gross-profit-sales-book.${format}`
  );
};
