import api from "@/utils/api";

export const getAllModules = async () => {
  const response = await api.get('/modules/all');
  return response.data;
};

export const getFeaturesByModuleId = async (moduleId: number) => {
  const response = await api.get(`/modules/${moduleId}/features`);
  return response.data;
};

export const getPermissions = async () => {
  const response = await api.get('/permissions');
  return response.data;
};

export const getCities = async () => {
  const response = await api.get('/pharmacy/cities');
  return response.data;
};

export const getAllRoles = async () => {
  const response = await api.get('/roles');
  return response.data;
};

export const createUser = async (data: any) => {
  const response = await api.post('/user/create', data);
  return response.data;
};

/**
 * What PUT /user/{userId} accepts. Deliberately narrower than the create
 * payload: the email, password and profile image are not part of an update —
 * the email is the account's identity and the image has its own endpoint.
 */
export interface UpdateUserPayload {
  user: {
    fullName: string | null;
    userPhone: string | null;
    employeeId: string | null;
    department: string | null;
    gender: string | null;
    dob: string | null;
    pharmaRolesDto: { roleId: number };
  };
  /** Pharmacy codes, e.g. ["SUDOC0001"]. Replaces the current assignment. */
  pharmacyIds: string[];
  /** Replaces the current grants; a feature left out loses all of its. */
  permissions: { featureId: number; permissionIds: number[] }[];
}

export const updateUser = async (
  userId: string | number,
  data: UpdateUserPayload
) => {
  const response = await api.put(`/user/${userId}`, data);
  return response.data;
};

export const checkUserEmail = async (email: string) => {
  const response = await api.get(`/user/check-email?email=${encodeURIComponent(email)}`);
  return response.data;
};

export const checkEmployeeId = async (employeeId: string) => {
  const response = await api.get(`/user/checkEmployeeId?employeeId=${encodeURIComponent(employeeId)}`);
  return response.data;
};

/**
 * @param partOfCreate Set only by the create wizard. The photo it uploads is
 *   part of the account being created, so the server folds it into the single
 *   USER_CREATED audit row instead of logging a separate "Profile image
 *   updated". Every later change is a real update and leaves its own row.
 */
export const uploadUserImage = async (
  userId: string | number,
  image: File,
  partOfCreate = false
) => {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('userId', String(userId));

  const response = await api.post(`/user/${userId}/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    // Omitted unless it is set, so nothing else changes shape.
    ...(partOfCreate ? { params: { partOfCreate: true } } : {}),
  });
  return response.data;
};


export const getAllUsers = async () => {
    try {
        const response = await api.get("/user/all");
        return response.data;
    } catch (error) {
        console.error(error);
        return null;
    }
  }
  
export const getUserById = async (userId: string | number) => {
  const response = await api.get(`/user/${userId}`);
  return response.data;
}

export const getById = async (userId: string | number) => {
  const response = await api.get(`/user/getById/${userId}`);
  return response.data;
}

export const checkDocumentNumber = async (documentNo: string) => {
  const response = await api.get<boolean>(`/pharmacyDocuments/checkDocument`, {
    params: { documentNo },
  });
  return response.data;
}

export const updateUserStatus = async (userId: string | number, userStatus: string) => {
  const response = await api.patch(`/user/${userId}/status`, { userStatus });
  return response.data;
}

/** One row of /audit/user-logs, as the API returns it. */
export interface AuditLogRecord {
  auditId: number;
  action: string;
  /** Who did it. */
  actorUserId: string | null;
  actorName: string | null;
  /** Who it was done to — the same person for a login. */
  targetUserId: string | null;
  targetName: string | null;
  details: string | null;
  ipAddress: string | null;
  pharmacyId: string | null;
  createdAt: string;
}

/**
 * A page of the audit trail. It is cursor-paginated, not offset-paginated:
 * there is no total count, and the next page is fetched by handing `nextCursor`
 * straight back.
 */
export interface AuditLogPage {
  data: AuditLogRecord[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface AuditLogQuery {
  /** e.g. LOGIN, USER_CREATED, USER_UPDATED. Omit for everything. */
  action?: string;
  /** Inclusive, as yyyy-mm-dd. */
  fromDate?: string;
  toDate?: string;
  size?: number;
  /** The previous page's `nextCursor`. */
  cursor?: string;
}

/**
 * Whose side of an entry to match on:
 *
 * - `ACTOR`  — only what this user did.
 * - `TARGET` — only what was done to them.
 * - `ALL`    — both, which is the server's default.
 *
 * A login has the same user on both sides, so it appears once under `ALL`.
 */
export type AuditScope = "ALL" | "ACTOR" | "TARGET";

export const getUserAuditLogs = async (
  query: AuditLogQuery = {}
): Promise<AuditLogPage> => {
  // Only the keys that carry a value travel, so an empty filter is not sent as
  // `action=` and read as "match nothing".
  const params = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== "")
  );

  const response = await api.get("/audit/user-logs", { params });
  return {
    data: response.data?.data ?? [],
    nextCursor: response.data?.nextCursor ?? null,
    hasMore: !!response.data?.hasMore,
  };
};

/**
 * One user's slice of the audit trail. Same shape, filters and cursor paging as
 * the full listing, so the server does the filtering that the screen used to do
 * by reading the whole stream.
 *
 * The endpoint refuses a user outside the caller's organization, so a failure
 * here is a real error rather than an empty page.
 */
export const getAuditLogsForUser = async (
  userId: string,
  query: AuditLogQuery & { scope?: AuditScope } = {}
): Promise<AuditLogPage> => {
  const params = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== "")
  );

  const response = await api.get(
    `/audit/user-logs/user/${encodeURIComponent(userId)}`,
    { params }
  );
  return {
    data: response.data?.data ?? [],
    nextCursor: response.data?.nextCursor ?? null,
    hasMore: !!response.data?.hasMore,
  };
};
