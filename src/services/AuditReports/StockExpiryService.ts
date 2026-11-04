import { downloadReportFile } from '@/services/FinancialReportService';
import { StockExpiryReportFilter, StockExpiryReportResponse } from '@/types/AuditReports/StockExpiryData';
import type { ReportExportFormat } from '@/types/FinancialReportData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?pharmacyIds=A&pharmacyIds=B), which Spring
// binds to List<...>; axios's default "pharmacyIds[]=A" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: StockExpiryReportFilter): URLSearchParams => {
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

// Stock Expiry Report: batch-wise stock on hand at pharmacies and warehouses
// with its expiry status, KPI totals and one page of the Expiry Details table.
export const getStockExpiryReport = async (filter: StockExpiryReportFilter): Promise<StockExpiryReportResponse> => {
  try {
    const response = await api.get('/auditReports/stock-expiry', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the stock expiry report.');
  }
};

// CSV / Excel download of the report with the same filters and sort as the
// screen: every matching row, not just the page.
export const downloadStockExpiryExport = (
  format: ReportExportFormat,
  filter: StockExpiryReportFilter
): Promise<void> => {
  const params = toSearchParams({ ...filter, page: undefined, size: undefined, unpaged: undefined });
  params.append('format', format);
  return downloadReportFile('/auditReports/stock-expiry/export', params, `stock-expiry.${format}`);
};
