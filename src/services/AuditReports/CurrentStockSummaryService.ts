import { downloadReportFile } from '@/services/FinancialReportService';
import { CurrentStockSummaryFilter, CurrentStockSummaryResponse } from '@/types/AuditReports/CurrentStockSummaryData';
import type { ReportExportFormat } from '@/types/FinancialReportData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?pharmacyIds=A&pharmacyIds=B), which Spring
// binds to List<...>; axios's default "pharmacyIds[]=A" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: CurrentStockSummaryFilter): URLSearchParams => {
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

// Current Stock Summary Report (CurrentStockSummaryController): location-, product-
// and batch-wise stock as of a date, with KPI totals and one page of the Stock
// Details table. Needs REPORTS/CURRENT_STOCK_SUMMARY/VIEW.
export const getCurrentStockSummaryReport = async (
  filter: CurrentStockSummaryFilter
): Promise<CurrentStockSummaryResponse> => {
  try {
    const response = await api.get('/auditReports/current-stock-summary', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the current stock summary report.');
  }
};

// CSV / Excel download of the report with the same filters and sort as the
// screen: every matching row, not just the page.
export const downloadCurrentStockSummaryExport = (
  format: ReportExportFormat,
  filter: CurrentStockSummaryFilter
): Promise<void> => {
  const params = toSearchParams({ ...filter, page: undefined, size: undefined, unpaged: undefined });
  params.append('format', format);
  return downloadReportFile('/auditReports/current-stock-summary/export', params, `current-stock-summary.${format}`);
};
