import { downloadReportFile } from '@/services/FinancialReportService';
import {
  PharmacySalesReturnReportFilter,
  PharmacySalesReturnReportResponse,
} from '@/types/AuditReports/PharmacySalesReturnData';
import type { ReportExportFormat } from '@/types/FinancialReportData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?pharmacyIds=A&pharmacyIds=B), which Spring
// binds to List<...>; axios's default "pharmacyIds[]=A" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: PharmacySalesReturnReportFilter): URLSearchParams => {
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

// Pharmacy Sales Return Report: completed sales returns against earlier
// pharmacy bills, with KPI totals, one page of the Sales Return Transactions
// table and the (unpaged) Sales Return Settlement Summary.
export const getPharmacySalesReturnReport = async (
  filter: PharmacySalesReturnReportFilter
): Promise<PharmacySalesReturnReportResponse> => {
  try {
    const response = await api.get('/auditReports/pharmacy-sales-return', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the pharmacy sales return report.');
  }
};

// CSV / Excel download of the report with the same filters and sort as the
// screen: every matching line, not just the page.
export const downloadPharmacySalesReturnExport = (
  format: ReportExportFormat,
  filter: PharmacySalesReturnReportFilter
): Promise<void> => {
  const params = toSearchParams({ ...filter, page: undefined, size: undefined, unpaged: undefined });
  params.append('format', format);
  return downloadReportFile('/auditReports/pharmacy-sales-return/export', params, `pharmacy-sales-return.${format}`);
};
