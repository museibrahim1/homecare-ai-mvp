const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api-production-a0a2.up.railway.app';

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
            errorMessage = error.detail.map((e: { msg?: string; message?: string }) => e.msg || e.message || JSON.stringify(e)).join(', ');
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
    return this.request<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      is_active: boolean;
      business_id?: string;
    }>('/auth/me', {}, token);
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

  async listGalleryTemplates() {
    return this.request<any[]>('/contract-templates/gallery/list', {});
  }

  async cloneGalleryTemplate(token: string, slug: string) {
    return this.request<any>(`/contract-templates/gallery/clone/${slug}`, { method: 'POST' }, token);
  }

  async exportContractWithTemplate(token: string, contractId: string, templateId?: string) {
    const params = templateId ? `?template_id=${templateId}` : '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${API_BASE}/visits/contracts/${contractId}/export-template${params}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Export failed' }));
        throw new Error(error.detail || 'Export failed');
      }
      return response.blob();
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error('Export timed out');
      throw err;
    }
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
  // ─── Smart Notes ───

  async getNotes(token: string, params?: { search?: string; tag?: string; client_id?: string; pinned?: boolean }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.client_id) query.set('client_id', params.client_id);
    if (params?.pinned !== undefined) query.set('pinned', String(params.pinned));
    return this.request<any[]>(`/notes?${query}`, {}, token);
  }

  async getSmartNote(token: string, noteId: string) {
    return this.request<any>(`/notes/${noteId}`, {}, token);
  }

  async createNote(token: string, data: { title: string; content: string; tags?: string[]; is_pinned?: boolean; color?: string; related_client_id?: string; source?: string }, extract?: boolean) {
    const query = extract !== undefined ? `?extract=${extract}` : '';
    return this.request<any>(`/notes${query}`, { method: 'POST', body: JSON.stringify(data) }, token);
  }

  async updateSmartNote(token: string, noteId: string, data: any) {
    return this.request<any>(`/notes/${noteId}`, { method: 'PUT', body: JSON.stringify(data) }, token);
  }

  async deleteNote(token: string, noteId: string) {
    return this.request<void>(`/notes/${noteId}`, { method: 'DELETE' }, token);
  }

  async extractTasksFromNote(token: string, noteId: string) {
    return this.request<{ summary: string | null; tasks_created: number; reminders_created: number }>(
      `/notes/${noteId}/extract-tasks`, { method: 'POST' }, token
    );
  }

  // ─── Tasks ───

  async getTasks(token: string, params?: { status?: string; priority?: string; due_before?: string; note_id?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.due_before) query.set('due_before', params.due_before);
    if (params?.note_id) query.set('note_id', params.note_id);
    return this.request<any[]>(`/notes/tasks?${query}`, {}, token);
  }

  async createTask(token: string, data: any) {
    return this.request<any>('/notes/tasks', { method: 'POST', body: JSON.stringify(data) }, token);
  }

  async updateTask(token: string, taskId: string, data: any) {
    return this.request<any>(`/notes/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }, token);
  }

  async completeTask(token: string, taskId: string) {
    return this.request<any>(`/notes/tasks/${taskId}/complete`, { method: 'PUT' }, token);
  }

  async deleteTask(token: string, taskId: string) {
    return this.request<void>(`/notes/tasks/${taskId}`, { method: 'DELETE' }, token);
  }

  // ─── Reminders ───

  async getReminders(token: string, params?: { upcoming?: boolean; dismissed?: boolean }) {
    const query = new URLSearchParams();
    if (params?.upcoming) query.set('upcoming', 'true');
    if (params?.dismissed !== undefined) query.set('dismissed', String(params.dismissed));
    return this.request<any[]>(`/notes/reminders?${query}`, {}, token);
  }

  async createReminder(token: string, data: any) {
    return this.request<any>('/notes/reminders', { method: 'POST', body: JSON.stringify(data) }, token);
  }

  async dismissReminder(token: string, reminderId: string) {
    return this.request<any>(`/notes/reminders/${reminderId}/dismiss`, { method: 'PUT' }, token);
  }

  async deleteReminder(token: string, reminderId: string) {
    return this.request<void>(`/notes/reminders/${reminderId}`, { method: 'DELETE' }, token);
  }

  async sendDueNotifications(token: string) {
    return this.request<{ due_count: number; emails_sent: number }>(
      '/notes/reminders/send-due-notifications', { method: 'POST' }, token
    );
  }

  // ─── Caregiver Cert Expiry ───

  async getExpiringCertifications(token: string, days?: number) {
    const query = days ? `?days=${days}` : '';
    return this.request<any[]>(`/caregivers/expiring${query}`, {}, token);
  }

  // ─── Sales Campaign Analytics ───

  async getCampaignAnalytics(token: string, params?: { campaign_tag?: string; days?: number }) {
    const query = new URLSearchParams();
    if (params?.campaign_tag) query.set('campaign_tag', params.campaign_tag);
    if (params?.days) query.set('days', String(params.days));
    return this.request<any>(`/platform/sales/leads/campaigns/analytics?${query}`, {}, token);
  }

  async getSequenceStatus(token: string) {
    return this.request<any>('/platform/sales/leads/campaigns/sequence/status', {}, token);
  }

  async launchSequence(token: string, data: {
    campaign_name: string;
    state?: string;
    priority?: string;
    max_years?: number;
    exclude_already_emailed?: boolean;
  }) {
    return this.request<any>('/platform/sales/leads/campaigns/sequence/launch', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  }

  async processScheduledEmails(token: string) {
    return this.request<any>('/platform/sales/leads/campaigns/sequence/process', {
      method: 'POST',
    }, token);
  }

  // ─── Churn & Usage Analytics ───

  async trackUsageEvent(token: string, data: {
    event_type: string;
    event_data?: Record<string, any>;
    page_path?: string;
    session_id?: string;
  }) {
    return this.request<any>('/analytics/track', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  }

  async getMyUsage(token: string, days?: number) {
    const query = days ? `?days=${days}` : '';
    return this.request<any>(`/analytics/my-usage${query}`, {}, token);
  }

  async getChurnOverview(token: string) {
    return this.request<any>('/analytics/churn/overview', {}, token);
  }

  async getChurnProviders(token: string, params?: { risk?: string; sort_by?: string; sort_order?: string }) {
    const query = new URLSearchParams();
    if (params?.risk) query.set('risk', params.risk);
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.sort_order) query.set('sort_order', params.sort_order);
    return this.request<any[]>(`/analytics/churn/providers?${query}`, {}, token);
  }

  async refreshEngagementScores(token: string) {
    return this.request<any>('/analytics/churn/refresh', { method: 'POST' }, token);
  }

  async getLeadFunnel(token: string) {
    return this.request<any>('/analytics/leads/funnel', {}, token);
  }

  async getPlatformActivity(token: string, days?: number) {
    const query = days ? `?days=${days}` : '';
    return this.request<any>(`/analytics/platform/activity${query}`, {}, token);
  }
}

export const api = new ApiClient();
