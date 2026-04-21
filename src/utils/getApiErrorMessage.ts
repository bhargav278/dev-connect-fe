import axios, { AxiosError } from 'axios';

type ApiErrorPayload = {
  success: false;
  message: string;
  errors?: unknown;
};

export function getApiErrorMessage(err: unknown) {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<ApiErrorPayload>;
    return axErr.response?.data?.message ?? axErr.message ?? 'Request failed';
  }
  if (err instanceof Error) return err.message;
  return 'Request failed';
}

