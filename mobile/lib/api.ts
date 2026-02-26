import { getToken, removeToken } from './auth';

const API_BASE = 'https://api-production-a0a2.up.railway.app';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  body?: Record<string, unknown> | FormData;
  headers?: Record<string, string>;
  noAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { ...opts.headers };

    if (!opts.noAuth) {
      const token = await getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const isFormData = opts.body instanceof FormData;
    if (!isFormData && opts.body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: opts.body
        ? isFormData
          ? (opts.body as FormData)
          : JSON.stringify(opts.body)
        : undefined,
    });

    if (response.status === 401) {
      await removeToken();
      throw new ApiError(401, 'Session expired. Please log in again.');
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(response.status, data.detail || `Request failed (${response.status})`);
    }

    if (response.status === 204) return {} as T;

    return response.json();
  }

  get<T>(path: string, opts?: RequestOptions) {
    return this.request<T>('GET', path, opts);
  }

  post<T>(path: string, body?: Record<string, unknown>, opts?: RequestOptions) {
    return this.request<T>('POST', path, { ...opts, body: body ?? opts?.body });
  }

  put<T>(path: string, body?: Record<string, unknown>, opts?: RequestOptions) {
    return this.request<T>('PUT', path, { ...opts, body });
  }

  delete<T>(path: string, opts?: RequestOptions) {
    return this.request<T>('DELETE', path, opts);
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    return this.request<T>('POST', path, { body: formData });
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export const api = new ApiClient(API_BASE);
