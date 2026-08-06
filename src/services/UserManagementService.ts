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

export const checkUserEmail = async (email: string) => {
  const response = await api.get(`/user/check-email?email=${encodeURIComponent(email)}`);
  return response.data;
};

export const checkEmployeeId = async (employeeId: string) => {
  const response = await api.get(`/user/checkEmployeeId?employeeId=${encodeURIComponent(employeeId)}`);
  return response.data;
};

export const uploadUserImage = async (userId: string | number, image: File) => {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('userId', String(userId));
  
  const response = await api.post(`/user/${userId}/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
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
