import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import { DoctorRecord } from '@/types/BillingData';

/** Every referring doctor for the selected pharmacy. */
export const getAllDoctors = async (): Promise<DoctorRecord[]> => {
  try {
    const response = await api.get('/doctor/allDoctor');
    return response.data ?? [];
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch doctors.');
  }
};

export const getDoctorById = async (
  doctorId: number | string
): Promise<DoctorRecord> => {
  try {
    const response = await api.get(`/doctor/getById/${doctorId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch doctor.');
  }
};

export const createDoctor = async (
  doctorName: string
): Promise<DoctorRecord> => {
  try {
    const response = await api.post('/doctor/create', { doctorName });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to create doctor.');
  }
};
