import {
  ProductWiseReportFilter,
  ProductWiseReportResponse,
} from '@/types/AuditReports/ProductWiseData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?pharmacyIds=A&pharmacyIds=B), which Spring
// binds to List<...>; axios's default "pharmacyIds[]=A" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: ProductWiseReportFilter): URLSearchParams => {
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

// Product-wise Purchase and Sales Analysis Report: products purchased from
// suppliers and sold through pharmacy billing during the period, with KPI
// totals, the Quantity Analysis and the Purchase and Sales Value Analysis.
export const getProductWiseReport = async (
  filter: ProductWiseReportFilter
): Promise<ProductWiseReportResponse> => {
  try {
    const response = await api.get('/auditReports/product-wise', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the product-wise purchase and sales analysis report.');
  }
};
