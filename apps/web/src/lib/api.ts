const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/** Format a Date to YYYY-MM-DD string in LOCAL timezone (avoids UTC shift bugs) */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

class ApiClient {
  private static readonly TIMEOUT_MS = 30000; // 30 second timeout
  private static readonly MAX_RETRIES = 1; // 1 retry on transient failures

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let lastError: Error | null = null;
    const maxAttempts = ApiClient.MAX_RETRIES + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ApiClient.TIMEOUT_MS);
      try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: 'Request failed' }));
          // Handle different error formats from FastAPI
          let errorMessage = 'Request failed';
          if (typeof error.detail === 'string') {
            errorMessage = error.detail;
          } else if (Array.isArray(error.detail)) {
            // Validation errors come as array
            errorMessage = error.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
          } else if (error.detail?.msg) {
            errorMessage = error.detail.msg;
          } else if (error.message) {
            errorMessage = error.message;
          }

          // Only retry on 5xx server errors, not client errors
          if (response.status >= 500 && attempt < ApiClient.MAX_RETRIES) {
            lastError = new Error(errorMessage);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }

          throw new Error(errorMessage);
        }

        return response.json();
      } catch (err: any) {
        clearTimeout(timeout);
        // If it's an abort error, convert to a friendlier message
        if (err.name === 'AbortError') {
          lastError = new Error('Request timed out. Please check your connection and try again.');
        } else if (err.message && !err.message.includes('Request failed')) {
          // Network error — retry on transient failures
          lastError = err;
        } else {
          throw err;
        }

        // Don't retry on the last attempt
        if (attempt >= ApiClient.MAX_RETRIES) {
          throw lastError || err;
        }

        // Wait before retry with backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    throw lastError || new Error('Request failed');
  }

  // Auth
  async login(email: string, password: string) {
    // Try regular auth first
    try {
      return await this.request<{ access_token: string; token_type: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    } catch (regularError: any) {
      // If regular auth fails, try business auth
      try {
        const businessResponse = await this.request<{ access_token: string; token_type: string; user: any; business: any }>('/auth/business/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        // Return in same format as regular auth
        return {
          access_token: businessResponse.access_token,
          token_type: businessResponse.token_type,
        };
      } catch (businessError: any) {
        // Both failed - throw the more specific error
        throw new Error(regularError.message || businessError.message || 'Invalid email or password');
      }
    }
  }

  async getMe(token: string) {
    return this.request<any>('/auth/me', {}, token);
  }

  // Usage / Subscription
  async getUsage(token: string) {
    return this.request<{
      completed_assessments: number;
      total_assessments: number;
      max_allowed: number;
      can_create: boolean;
      plan_name: string;
      plan_tier: string;
      has_paid_plan: boolean;
      upgrade_required: boolean;
    }>('/visits/usage', {}, token);
  }

  // Visits
  async getVisits(token: string, params?: { status?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    
    return this.request<{ items: any[]; total: number; page: number; page_size: number }>(
      `/visits?${query}`,
      {},
      token
    );
  }

  async getVisit(token: string, visitId: string) {
    return this.request<any>(`/visits/${visitId}`, {}, token);
  }

  async createVisit(token: string, data: any) {
    return this.request<any>('/visits', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  }

  // Transcript
  async getTranscript(token: string, visitId: string) {
    return this.request<{ segments: any[]; total_duration_ms: number; word_count: number }>(
      `/visits/${visitId}/transcript`,
      {},
      token
    );
  }

  // Diarization
  async getDiarization(token: string, visitId: string) {
    return this.request<{ turns: any[]; speakers: string[]; total_turns: number }>(
      `/visits/${visitId}/diarization`,
      {},
      token
    );
  }

  // Billables
  async getBillables(token: string, visitId: string) {
    return this.request<{ items: any[]; total_minutes: number; total_adjusted_minutes: number }>(
      `/visits/${visitId}/billables`,
      {},
      token
    );
  }

  async updateBillableItem(token: string, visitId: string, itemId: string, data: any) {
    return this.request<any>(
      `/visits/${visitId}/billables/${itemId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      token
    );
  }

  // Notes
  async getNote(token: string, visitId: string) {
    return this.request<any>(`/visits/${visitId}/note`, {}, token);
  }

  // Restart Assessment
  async restartAssessment(token: string, visitId: string) {
    return this.request<any>(`/visits/${visitId}/restart`, {
      method: 'POST',
    }, token);
  }

  async updateNote(token: string, visitId: string, data: any) {
    return this.request<any>(
      `/visits/${visitId}/note`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      token
    );
  }

  // Contracts
  async getContract(token: string, visitId: string) {
    return this.request<any>(`/visits/${visitId}/contract`, {}, token);
  }

  async createContract(token: string, data: {
    client_id: string;
    title: string;
    services?: { name: string; rate?: number; unit?: string }[];
    schedule?: { days?: string[]; hours_per_week?: number; start_time?: string; end_time?: string };
    hourly_rate?: number;
    weekly_hours?: number;
    start_date?: string;
    end_date?: string;
    cancellation_policy?: string;
    terms_and_conditions?: string;
  }) {
    return this.request<any>('/visits/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  }

  async listContracts(token: string) {
    return this.request<any[]>('/visits/contracts', {}, token);
  }

  // Pipeline
  async runPipelineStep(token: string, visitId: string, step: string) {
    return this.request<any>(
      `/pipeline/visits/${visitId}/${step}`,
      { method: 'POST' },
      token
    );
  }

  async getPipelineStatus(token: string, visitId: string) {
    return this.request<{ visit_id: string; status: string; pipeline_state: any }>(
      `/pipeline/visits/${visitId}/status`,
      {},
      token
    );
  }

  // Clients
  async getClients(token: string) {
    return this.request<any[]>('/clients', {}, token);
  }

  async createClient(token: string, data: any) {
    return this.request<any>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  }

  async updateClient(token: string, clientId: string, data: any) {
    return this.request<any>(`/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token);
  }

  // Contract Templates
  async uploadContractTemplate(token: string, file: File, name: string, description?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (description) formData.append('description', description);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(`${API_BASE}/contract-templates/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(error.detail || 'Upload failed');
      }
      return response.json();
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error('Template upload timed out');
      throw err;
    }
  }

  async listContractTemplates(token: string) {
    return this.request<any[]>('/contract-templates/', {}, token);
  }

  async getContractTemplate(token: string, templateId: string) {
    return this.request<any>(`/contract-templates/${templateId}`, {}, token);
  }

  async deleteContractTemplate(token: string, templateId: string) {
    return this.request<void>(`/contract-templates/${templateId}`, { method: 'DELETE' }, token);
  }

  async rescanTemplate(token: string, templateId: string) {
    return this.request<any>(`/contract-templates/${templateId}/rescan`, { method: 'POST' }, token);
  }

  async updateTemplateMapping(token: string, templateId: string, updates: { field_id: string; mapped_to: string }[]) {
    return this.request<any>(`/contract-templates/${templateId}/mapping`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, token);
  }

  async reconcileTemplates(token: string, newTemplateId: string, oldTemplateId: string) {
    return this.request<any>(`/contract-templates/${newTemplateId}/reconcile/${oldTemplateId}`, {
      method: 'POST',
    }, token);
  }

  async getFieldRegistry(token: string) {
    return this.request<any>('/contract-templates/registry/fields', {}, token);
  }

  // Upload — uses longer timeout (5 minutes) for large audio files
  async uploadAudio(token: string, visitId: string, file: File, autoProcess: boolean = true) {
    const formData = new FormData();
    formData.append('visit_id', visitId);
    formData.append('file', file);
    formData.append('auto_process', autoProcess ? 'true' : 'false');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for uploads

    try {
      const response = await fetch(`${API_BASE}/uploads/audio`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(error.detail || 'Upload failed');
      }

      return response.json();
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Upload timed out. The file may be too large — please try a shorter recording.');
      }
      throw err;
    }
  }
}

export const api = new ApiClient();
