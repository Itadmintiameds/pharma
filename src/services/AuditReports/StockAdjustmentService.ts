import { downloadReportFile } from '@/services/FinancialReportService';
import { StockAdjustmentReportFilter, StockAdjustmentReportResponse } from '@/types/AuditReports/StockAdjustmentData';
import type { ReportExportFormat } from '@/types/FinancialReportData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?pharmacyIds=A&pharmacyIds=B), which Spring
// binds to List<...>; axios's default "pharmacyIds[]=A" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: StockAdjustmentReportFilter): URLSearchParams => {
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

// Stock Adjustment Report: transaction-wise inventory quantities increased or
// decreased through Stock Adjustment in the period, with KPI totals and one
// page of the Adjustment Transactions table.
export const getStockAdjustmentReport = async (
  filter: StockAdjustmentReportFilter
): Promise<StockAdjustmentReportResponse> => {
  try {
    const response = await api.get('/auditReports/stock-adjustment', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the stock adjustment report.');
  }
};

// CSV / Excel download of the report with the same filters and sort as the
// screen: every matching row, not just the page.
export const downloadStockAdjustmentExport = (
  format: ReportExportFormat,
  filter: StockAdjustmentReportFilter
): Promise<void> => {
  const params = toSearchParams({ ...filter, page: undefined, size: undefined, unpaged: undefined });
  params.append('format', format);
  return downloadReportFile('/auditReports/stock-adjustment/export', params, `stock-adjustment.${format}`);
};
