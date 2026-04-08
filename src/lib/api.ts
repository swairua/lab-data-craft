// Custom error classes for different error types
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class ServerError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

// In development, use the local proxy; in production, use the configured URL or external API
const isDevelopment = import.meta.env.DEV;

// Get the base URL - construct absolute URL for relative paths
const getApiBaseUrl = (): string => {
  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  // Always use the direct API URL to avoid proxy cookie handling issues
  // The proxy through localhost can cause session cookies to not be properly transmitted
  // due to SameSite restrictions and origin header changes
  return "https://lab.wayrus.co.ke/api.php";
};

export const API_BASE_URL = getApiBaseUrl();

export interface ApiUser {
  id: number;
  email: string;
  name: string;
}

interface LoginResponse {
  message: string;
  user_id: number;
  user: ApiUser;
}

interface CurrentUserResponse {
  user: ApiUser | null;
  authenticated: boolean;
}

interface LogoutResponse {
  message: string;
}

export const buildApiUrl = (params?: Record<string, string | number | boolean | null | undefined>) => {
  const url = new URL(API_BASE_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

export const apiRequest = async <T>(
  init?: RequestInit,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> => {
  const headers = new Headers(init?.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = buildApiUrl(params);
  let response: Response;
  try {
    response = await fetch(url, {
      credentials: "include",
      ...init,
      headers,
    });
  } catch (error) {
    // Network error (no connection, timeout, etc.)
    const message = error instanceof Error ? error.message : "Network request failed";
    console.debug("API Network Error:", { url, message, params });
    throw new NetworkError(`Network error: ${message}`);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.debug("API Error Response:", {
      url,
      status: response.status,
      statusText: response.statusText,
      data,
      params,
    });

    // Handle 401/403 auth errors
    if (response.status === 401 || response.status === 403) {
      throw new AuthError(
        data?.message || data?.error || "Session expired or access denied"
      );
    }

    // Handle 5xx server errors
    if (response.status >= 500) {
      throw new ServerError(
        data?.message || data?.error || "Server error"
      );
    }

    // Handle 4xx validation/client errors (except 401/403 already handled above)
    throw new ValidationError(
      data?.message || data?.error || "Request validation failed"
    );
  }

  return data as T;
};

export const loginUser = (email: string, password: string) =>
  apiRequest<LoginResponse>(
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    { action: "login" },
  );

// Error type checking helpers
export const isAuthApiError = (error: unknown): error is AuthError =>
  error instanceof AuthError;

export const isNetworkError = (error: unknown): error is NetworkError =>
  error instanceof NetworkError;

export const isServerError = (error: unknown): error is ServerError =>
  error instanceof ServerError;

export const isValidationError = (error: unknown): error is ValidationError =>
  error instanceof ValidationError;

export const fetchCurrentUser = async () => {
  try {
    const response = await apiRequest<CurrentUserResponse>(undefined, { action: "me" });
    return response.user;
  } catch (error) {
    if (isAuthApiError(error)) {
      return null;
    }

    throw error;
  }
};

export interface ApiListResponse<T> {
  table: string;
  data: T[];
  limit: number;
  offset: number;
}

export interface ApiReadResponse<T> {
  table: string;
  data: T;
}

export interface ApiWriteResponse<T> {
  message: string;
  table: string;
  id?: number;
  data: T | null;
  deleted?: boolean;
}

export const listRecords = async <T>(table: string, params?: Record<string, string | number | boolean | null | undefined>) =>
  apiRequest<ApiListResponse<T>>(undefined, { action: "list", table, ...params });

export const readRecord = async <T>(table: string, id: string | number) =>
  apiRequest<ApiReadResponse<T>>(undefined, { action: "read", table, id });

export const createRecord = async <T>(table: string, data: Record<string, unknown>) =>
  apiRequest<ApiWriteResponse<T>>({ method: "POST", body: JSON.stringify({ table, data }) }, { action: "create" });

export const updateRecord = async <T>(table: string, id: string | number, data: Record<string, unknown>) =>
  apiRequest<ApiWriteResponse<T>>({ method: "PUT", body: JSON.stringify({ table, id, data }) }, { action: "update" });

export const deleteRecord = async <T>(table: string, id: string | number) =>
  apiRequest<ApiWriteResponse<T>>({ method: "DELETE", body: JSON.stringify({ table, id }) }, { action: "delete" });

export const logoutUser = () => apiRequest<LogoutResponse>({ method: "POST" }, { action: "logout" });
