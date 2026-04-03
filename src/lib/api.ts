export interface User {
  id: number;
  email: string;
  name: string;
}

export interface ApiError {
  error: string;
  message?: string;
}

export interface ListResponse<T> {
  table: string;
  data: T[];
  limit: number;
  offset: number;
}

export interface CreateResponse<T> {
  message: string;
  table: string;
  id: number;
  data: T;
}

export interface UpdateResponse<T> {
  message: string;
  table: string;
  data: T;
}

export interface DeleteResponse {
  message: string;
  table: string;
  deleted: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || (import.meta.env.VITE_API_URL as string) || '/backend/api.php';
  }

  private async request<T>(
    method: string,
    params: Record<string, string | number> = {},
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(this.baseUrl, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    const options: RequestInit = {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new ApiError(response.status, data.error || data.message || 'API request failed');
    }

    return (await response.json()) as T;
  }

  // Auth endpoints
  async register(email: string, password: string, name: string): Promise<{ user_id: number; user: User }> {
    return this.request('POST', { action: 'register' }, { email, password, name });
  }

  async login(email: string, password: string): Promise<{ user_id: number; user: User }> {
    return this.request('POST', { action: 'login' }, { email, password });
  }

  async logout(): Promise<{ message: string }> {
    return this.request('POST', { action: 'logout' });
  }

  async getMe(): Promise<{ user: User | null; authenticated: boolean }> {
    try {
      return await this.request('GET', { action: 'me' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return { user: null, authenticated: false };
      }
      throw error;
    }
  }

  // Generic CRUD endpoints
  async list<T>(
    table: string,
    options: { limit?: number; offset?: number; orderBy?: string; direction?: string } = {},
  ): Promise<ListResponse<T>> {
    return this.request('GET', {
      table,
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
      ...(options.orderBy && { orderBy: options.orderBy }),
      ...(options.direction && { direction: options.direction }),
    });
  }

  async read<T>(table: string, id: number | string): Promise<{ table: string; data: T }> {
    return this.request('GET', { table, id: String(id) });
  }

  async create<T>(table: string, data: Record<string, unknown>): Promise<CreateResponse<T>> {
    return this.request('POST', { table, action: 'create' }, { ...data });
  }

  async update<T>(table: string, id: number | string, data: Record<string, unknown>): Promise<UpdateResponse<T>> {
    return this.request('PATCH', { table, id: String(id), action: 'update' }, { ...data });
  }

  async delete(table: string, id: number | string): Promise<DeleteResponse> {
    return this.request('DELETE', { table, id: String(id), action: 'delete' });
  }
}

export const createApiClient = (baseUrl?: string) => new ApiClient(baseUrl);
