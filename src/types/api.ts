export type ApiErrorPayload = {
  success: false;
  message: string;
  errors?: unknown;
};

export type ApiSuccessPayload<T> = {
  success: true;
  message: string;
  data?: T;
};

