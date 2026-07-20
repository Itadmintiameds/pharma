import api from "@/utils/api";

export const getAllUsers = async () => {
    try {
        const response = await api.get("/users/all");
        return response.data;
    } catch (error) {
        console.error(error);
        return null;
    }
};