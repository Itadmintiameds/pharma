import { downloadReportFile } from '@/services/FinancialReportService';
import { PurchaseRegisterReportFilter, PurchaseRegisterReportResponse } from '@/types/AuditReports/PurchaseRegisterData';
import type { ReportExportFormat } from '@/types/FinancialReportData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?pharmacyIds=A&pharmacyIds=B), which Spring
// binds to List<...>; axios's default "pharmacyIds[]=A" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: PurchaseRegisterReportFilter): URLSearchParams => {
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

// Purchase Register Report: transaction-wise medicines purchased and onboarded
// into inventory through supplier purchase invoices in the period, with KPI
// totals and one page of the Purchase Details table.
export const getPurchaseRegisterReport = async (
  filter: PurchaseRegisterReportFilter
): Promise<PurchaseRegisterReportResponse> => {
  try {
    const response = await api.get('/auditReports/purchase-register', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the purchase register report.');
  }
};

// CSV / Excel download of the report with the same filters and sort as the
// screen: every matching row, not just the page.
export const downloadPurchaseRegisterExport = (
  format: ReportExportFormat,
  filter: PurchaseRegisterReportFilter
): Promise<void> => {
  const params = toSearchParams({ ...filter, page: undefined, size: undefined, unpaged: undefined });
  params.append('format', format);
  return downloadReportFile('/auditReports/purchase-register/export', params, `purchase-register.${format}`);
};
