import { downloadReportFile } from '@/services/FinancialReportService';
import { StockReturnReportFilter, StockReturnReportResponse } from '@/types/AuditReports/StockReturnData';
import type { ReportExportFormat } from '@/types/FinancialReportData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?pharmacyIds=A&pharmacyIds=B), which Spring
// binds to List<...>; axios's default "pharmacyIds[]=A" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: StockReturnReportFilter): URLSearchParams => {
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

// Stock Return Report: transaction-wise products returned from pharmacies and
// warehouses in the period, with KPI totals and one page of the Return
// Transactions table.
export const getStockReturnReport = async (
  filter: StockReturnReportFilter
): Promise<StockReturnReportResponse> => {
  try {
    const response = await api.get('/auditReports/stock-return', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the stock return report.');
  }
};

// CSV / Excel download of the report with the same filters and sort as the
// screen: every matching row, not just the page.
export const downloadStockReturnExport = (
  format: ReportExportFormat,
  filter: StockReturnReportFilter
): Promise<void> => {
  const params = toSearchParams({ ...filter, page: undefined, size: undefined, unpaged: undefined });
  params.append('format', format);
  return downloadReportFile('/auditReports/stock-return/export', params, `stock-return.${format}`);
};
