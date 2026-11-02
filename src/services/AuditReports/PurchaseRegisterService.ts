import { PurchaseRegisterReportFilter, PurchaseRegisterReportResponse } from '@/types/AuditReports/PurchaseRegisterData';
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
