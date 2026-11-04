import {
  UserWiseCollectionReportFilter,
  UserWiseCollectionReportResponse,
} from '@/types/AuditReports/UserWiseCollectionData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?userIds=A&userIds=B), which Spring binds to
// List<...>; axios's default "userIds[]=A" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: UserWiseCollectionReportFilter): URLSearchParams => {
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

// User-wise Collection Report: payments collected and recorded by individual
// users through pharmacy billing and receipt transactions, with KPI totals,
// the User-wise Collection Summary and one page of the Collection Transaction Details.
export const getUserWiseCollectionReport = async (
  filter: UserWiseCollectionReportFilter
): Promise<UserWiseCollectionReportResponse> => {
  try {
    const response = await api.get('/auditReports/user-wise-collection', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the user-wise collection report.');
  }
};
