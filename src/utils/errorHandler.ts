import axios from "axios";

export const handleApiError = (
  error: unknown,
  defaultMessage: string
): never => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    // Handle plain string error responses directly
    if (typeof data === "string" && data.trim().length > 0) {
      throw new Error(data);
    }

    throw new Error(
      data?.message ||
      data?.error ||
      defaultMessage
    );
  }

  throw new Error(defaultMessage);
};