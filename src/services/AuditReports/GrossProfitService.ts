import { downloadReportFile } from '@/services/FinancialReportService';
import {
  GrossProfitReportFilter,
  GrossProfitReportResponse,
} from '@/types/AuditReports/GrossProfitData';
import type { ReportExportFormat } from '@/types/FinancialReportData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?customerTypes=WALK_IN&customerTypes=OP_PATIENT), which
// Spring binds to List<...>; axios's default "customerTypes[]=WALK_IN" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: GrossProfitReportFilter): URLSearchParams => {
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

// Gross Profit / Margin Analysis Report: gross profit from pharmacy sales,
// comparing net sales revenue with the purchase cost of the products sold,
// with KPI totals and one page of the Product Profitability table.
export const getGrossProfitReport = async (
  filter: GrossProfitReportFilter
): Promise<GrossProfitReportResponse> => {
  try {
    const response = await api.get('/auditReports/gross-profit', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the gross profit report.');
  }
};

// CSV / Excel download of the report with the same filters and sort as the
// screen: every matching row, not just the page.
export const downloadGrossProfitExport = (
  format: ReportExportFormat,
  filter: GrossProfitReportFilter
): Promise<void> => {
  const params = toSearchParams({ ...filter, page: undefined, size: undefined, unpaged: undefined });
  params.append('format', format);
  return downloadReportFile('/auditReports/gross-profit/export', params, `gross-profit.${format}`);
};
