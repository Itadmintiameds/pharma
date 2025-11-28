import api from '@/utils/api';
import { VariantData } from '@/app/types/VariantData';

export const createVariant = async (variantData: VariantData) => {
    try {
        const response = await api.post('pharma/variant/save', variantData);
        return response.data.data;
    } catch (error: unknown) {
        console.error('Error creating variant:', error);
        if (error instanceof Error) {
            throw new Error(`Error creating variant: ${error.message}`);
        } else {
            throw new Error('An unknown error occurred while creating variant.');
        }
    }
};

export const getVariant = async (): Promise<VariantData[]> => {
    try {
        const response = await api.get('pharma/variant/getAll');
        return response.data.data;
    } catch (error: unknown) {
        console.error('Error fetching variants:', error);
        if (error instanceof Error) {
            throw new Error(`Error fetching variants: ${error.message}`);
        } else {
            throw new Error('An unknown error occurred while fetching variants.');
        }
    }
};

export const getVariantById = async (variantId: string): Promise<VariantData> => {
    try {
        const response = await api.get(`pharma/variant/getById/${variantId}`);
        return response.data.data;
    } catch (error: unknown) {
        console.error('Error fetching variant:', error);
        if (error instanceof Error) {
            throw new Error(`Error fetching variant: ${error.message}`);
        } else {
            throw new Error('An unknown error occurred while fetching variant.');
        }
    }
};

export const updateVariant = async (variantId: string, variantData: VariantData) => {
    try {
        const response = await api.put(`pharma/variant/update/${variantId}`, variantData);
        return response.data.data;
    } catch (error: unknown) {
        console.error('Error updating variant:', error);
        if (error instanceof Error) {
            throw new Error(`Error updating variant: ${error.message}`);
        } else {
            throw new Error('An unknown error occurred while updating variant.');
        }
    }
};

export const deleteVariant = async (variantId: string) => {
    try {
        await api.delete(`pharma/variant/delete/${variantId}`);
        return { success: true, message: 'Variant deleted successfully' };
    } catch (error: unknown) {
        console.error('Error deleting variant:', error);
        if (error instanceof Error) {
            throw new Error(`Error deleting variant: ${error.message}`);
        } else {
            throw new Error('An unknown error occurred while deleting variant.');
        }
    }
};

// Helper function to check for duplicate variant names
export const checkDuplicateVariant = async (variantName: string, existingVariantId?: string) => {
    try {
        const variants = await getVariant();
        const duplicate = variants.find(variant =>
            variant.variantName.toLowerCase() === variantName.toLowerCase() &&
            variant.variantId !== existingVariantId
        );
        return { duplicate: !!duplicate, existingVariant: duplicate };
    } catch (error) {
        console.error('Error checking duplicate variant:', error);
        return { duplicate: false, existingVariant: null };
    }
};







// This is the original content of VariantService.ts before it was updated..................................
// import api from '@/utils/api';

// export const getVariant = async () => {
//     try {
//         const response = await api.get('pharma/variant/getAll');
//         return response.data.data;
//     } catch (error: unknown) {
//         console.error('Error fetching Variant:', error);
//         if (error instanceof Error) {
//             throw new Error(`Error fetching Variant: ${error.message}`);
//         } else {
//             throw new Error('An unknown error occurred while fetching Variant.');
//         }
//     }
// };


// export const getVariantById = async (variantTypeId: string) => {
//     try {
//         const response = await api.get(`pharma/variant/getById/${variantTypeId}`);
//         return response.data.data;
//     } catch (error: unknown) {
//         console.error('Error fetching Variant:', error);
//         if (error instanceof Error) {
//             throw new Error(`Error fetching Variant: ${error.message}`);
//         } else {
//             throw new Error('An unknown error occurred while Variant.');
//         }
//     }
//   };