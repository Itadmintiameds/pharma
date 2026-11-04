import { downloadReportFile } from '@/services/FinancialReportService';
import {
  SupplierPurchaseReturnReportFilter,
  SupplierPurchaseReturnReportResponse,
} from '@/types/AuditReports/SupplierPurchaseReturnData';
import type { ReportExportFormat } from '@/types/FinancialReportData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?pharmacyIds=A&pharmacyIds=B), which Spring
// binds to List<...>; axios's default "pharmacyIds[]=A" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: SupplierPurchaseReturnReportFilter): URLSearchParams => {
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

// Supplier Purchase Return Report: transaction-wise products returned to
// suppliers through the Purchase Return workflow in the period, with KPI
// totals and one page of the Purchase Return Details table.
export const getSupplierPurchaseReturnReport = async (
  filter: SupplierPurchaseReturnReportFilter
): Promise<SupplierPurchaseReturnReportResponse> => {
  try {
    const response = await api.get('/auditReports/supplier-purchase-return', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the supplier purchase return report.');
  }
};

// CSV / Excel download of the report with the same filters and sort as the
// screen: every matching row, not just the page.
export const downloadSupplierPurchaseReturnExport = (
  format: ReportExportFormat,
  filter: SupplierPurchaseReturnReportFilter
): Promise<void> => {
  const params = toSearchParams({ ...filter, page: undefined, size: undefined, unpaged: undefined });
  params.append('format', format);
  return downloadReportFile(
    '/auditReports/supplier-purchase-return/export',
    params,
    `supplier-purchase-return.${format}`
  );
};
