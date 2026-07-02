import axios from "axios";

export const handleApiError = (
  error: unknown,
  defaultMessage: string
): never => {
  console.error(defaultMessage, error);

  if (axios.isAxiosError(error)) {
    throw new Error(
      error.response?.data?.message ||
      error.response?.data?.error ||
      defaultMessage
    );
  }

  throw new Error(defaultMessage);
};