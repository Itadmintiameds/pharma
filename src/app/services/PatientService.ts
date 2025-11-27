import api from '@/utils/api';
import { AxiosError } from 'axios';
import { PatientData } from '../types/PatientData';

export const createPatient = async (formData: PatientData): Promise<PatientData> => {
    try {
      const response = await api.post<{ data: PatientData; message: string; status: string }>(
        'pharma/patient/save',
        formData
      );
      console.log("API Response:", response.data); // Debug response
    //   toast.success(response.data.message);
      return response.data.data;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const message = error.response?.data?.message || 'An error occurred while creating the Patient.';
        // toast.error(message);
        throw new Error(message);
      } else {
        throw new Error('An unknown error occurred.');
      }
    }
  };


  export const getPatient = async () => {
    try {
        const response = await api.get('pharma/patient/getAll');
        return response.data.data;
    } catch (error: unknown) {
        console.error('Error fetching Patient:', error);
        if (error instanceof Error) {
            throw new Error(`Error fetching Patient: ${error.message}`);
        } else {
            throw new Error('An unknown error occurred while fetching Patient.');
        }
    }
  };


export const getPatientById = async (patientId: string) => {
  try {
      const response = await api.get(`pharma/patient/getById/${patientId}`);
      return response.data.data;
  } catch (error: unknown) {
      console.error('Error fetching Patient:', error);
      if (error instanceof Error) {
          throw new Error(`Error fetching Patient: ${error.message}`);
      } else {
          throw new Error('An unknown error occurred while Patient.');
      }
  }
};


  export const updatePatient = async (patientId: string, patientData: PatientData) => {
    try {
        const response = await api.put(`pharma/patient/update/${patientId}`, patientData);
        return response.data;
    } catch (error: unknown) {
        console.error('Error updating Patient:', error);
        if (error instanceof Error) {
            throw new Error(`Error updating Patient: ${error.message}`);
        } else {
            throw new Error('An unknown error occurred while updating Patient.');
        }
    }
};



export const patientDelete = async (patientId: string) => {
    try {
        const response = await api.delete(`pharma/patient/delete/${patientId}`);
        return response.data;
    } catch (error: unknown) {
        console.error('Error deleting Patient:', error);
        if (error instanceof Error) {
            throw new Error(`Error deleting Patient: ${error.message}`);
        } else {
            throw new Error('An unknown error occurred while deleting Patient.');
        }
    }
}

export const checkDuplicate = async (data: {firstName: string; phone: number;}): Promise<{ duplicate: boolean }> => {
  try {
    const response = await api.post<{ duplicate: boolean }>(
      'pharma/patient/check-duplicate',
      data
    );
    return response.data;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      const message = error.response?.data?.message || 'Failed to check duplicate.';
      throw new Error(message);
    } else {
      throw new Error('An unknown error occurred.');
    }
  }
};


  export const maxPatientId = async () => {
    try {
        const response = await api.get('pharma/patient/maxPatientId');
        return response.data.data;
    } catch (error: unknown) {
        console.error('Error fetching Max PatientId:', error);
        if (error instanceof Error) {
            throw new Error(`Error fetching Max PatientId: ${error.message}`);
        } else {
            throw new Error('An unknown error occurred while fetching Max PatientId.');
        }
    }
  };