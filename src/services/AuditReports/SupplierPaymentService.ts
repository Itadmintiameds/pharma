import { downloadReportFile } from '@/services/FinancialReportService';
import {
  SupplierPaymentReportFilter,
  SupplierPaymentReportResponse,
} from '@/types/AuditReports/SupplierPaymentData';
import type { ReportExportFormat } from '@/types/FinancialReportData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?paymentModes=CASH&paymentModes=UPI), which Spring
// binds to List<...>; axios's default "paymentModes[]=CASH" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: SupplierPaymentReportFilter): URLSearchParams => {
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

// Supplier Payment Report: transaction-wise, supplier-wise and purchase
// invoice-wise payments made to suppliers against credit purchase invoices,
// with KPI totals, one page of the Payment Transactions table and the
// Payment Mode-wise Summary.
export const getSupplierPaymentReport = async (
  filter: SupplierPaymentReportFilter
): Promise<SupplierPaymentReportResponse> => {
  try {
    const response = await api.get('/auditReports/supplier-payment', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the supplier payment report.');
  }
};

// CSV / Excel download of the report with the same filters and sort as the
// screen: every matching row, not just the page.
export const downloadSupplierPaymentExport = (
  format: ReportExportFormat,
  filter: SupplierPaymentReportFilter
): Promise<void> => {
  const params = toSearchParams({ ...filter, page: undefined, size: undefined, unpaged: undefined });
  params.append('format', format);
  return downloadReportFile('/auditReports/supplier-payment/export', params, `supplier-payment.${format}`);
};
