import { downloadReportFile } from '@/services/FinancialReportService';
import {
  SupplierOutstandingReportFilter,
  SupplierOutstandingReportResponse,
} from '@/types/AuditReports/SupplierOutstandingData';
import type { ReportExportFormat } from '@/types/FinancialReportData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?supplierIds=1&supplierIds=2), which Spring
// binds to List<...>; axios's default "supplierIds[]=1" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: SupplierOutstandingReportFilter): URLSearchParams => {
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

// Supplier Outstanding Report: supplier-wise and purchase invoice-wise amounts
// still payable on credit purchases after supplier payments and confirmed
// purchase returns, with KPI totals and one page of the Outstanding Invoices table.
export const getSupplierOutstandingReport = async (
  filter: SupplierOutstandingReportFilter
): Promise<SupplierOutstandingReportResponse> => {
  try {
    const response = await api.get('/auditReports/supplier-outstanding', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the supplier outstanding report.');
  }
};

// CSV / Excel download of the report with the same filters and sort as the
// screen: every matching row, not just the page.
export const downloadSupplierOutstandingExport = (
  format: ReportExportFormat,
  filter: SupplierOutstandingReportFilter
): Promise<void> => {
  const params = toSearchParams({ ...filter, page: undefined, size: undefined, unpaged: undefined });
  params.append('format', format);
  return downloadReportFile('/auditReports/supplier-outstanding/export', params, `supplier-outstanding.${format}`);
};
