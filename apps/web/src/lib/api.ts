const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
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

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

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
      throw new Error(errorMessage);
    }

    return response.json();
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

  // Upload
  async uploadAudio(token: string, visitId: string, file: File, autoProcess: boolean = true) {
    const formData = new FormData();
    formData.append('visit_id', visitId);
    formData.append('file', file);
    formData.append('auto_process', autoProcess ? 'true' : 'false');

    const response = await fetch(`${API_BASE}/uploads/audio`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }
}

export const api = new ApiClient();
