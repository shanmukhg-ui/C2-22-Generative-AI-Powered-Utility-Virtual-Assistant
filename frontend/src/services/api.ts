import axios from 'axios';
import { auth } from '../config/firebase';
import {
  User, ChatMessage, ServiceRequest, Complaint,
  OperationalLog, KnowledgeDocument, AuditLog
} from '../types';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach verified Firebase ID token
client.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.warn('Could not retrieve active Firebase ID token', err);
    }
  }
  return config;
});

// Interceptor to handle unauthenticated (401) responses cleanly
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      window.dispatchEvent(new CustomEvent('utilityai:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  getMe: async (): Promise<User> => {
    const res = await client.get('/auth/me');
    return res.data;
  },
  updateProfile: async (data: Partial<User>): Promise<{ success: boolean; user: User; message: string }> => {
    const res = await client.put('/auth/profile', data);
    return res.data;
  }
};

export const chatApi = {
  sendMessage: async (message: string, sessionId?: string, role?: string, userId?: string) => {
    const res = await client.post('/chat', {
      message,
      session_id: sessionId,
      role,
      user_id: userId
    });
    return res.data;
  },
  getHistory: async (sessionId?: string) => {
    const res = await client.get('/chat/history', { params: { session_id: sessionId } });
    return res.data.history || [];
  }
};

export const requestsApi = {
  listRequests: async (params?: any) => {
    const res = await client.get('/requests', { params });
    return res.data;
  },
  getRequest: async (id: string): Promise<ServiceRequest> => {
    const res = await client.get(`/requests/${id}`);
    return res.data;
  },
  createRequest: async (data: any) => {
    const res = await client.post('/requests', data);
    return res.data;
  },
  getTracking: async (id: string) => {
    const res = await client.get(`/requests/${id}/tracking`);
    return res.data;
  },
  updateDispatch: async (id: string, data: any) => {
    const res = await client.patch(`/requests/${id}/dispatch`, data);
    return res.data;
  },
  updateRequest: async (id: string, data: any) => {
    const res = await client.patch(`/requests/${id}`, data);
    return res.data;
  }
};

export const complaintsApi = {
  listComplaints: async (params?: any) => {
    const res = await client.get('/complaints', { params });
    return res.data;
  },
  getComplaint: async (id: string): Promise<Complaint> => {
    const res = await client.get(`/complaints/${id}`);
    return res.data;
  },
  createComplaint: async (data: any) => {
    const res = await client.post('/complaints', data);
    return res.data;
  },
  updateComplaint: async (id: string, data: any) => {
    const res = await client.patch(`/complaints/${id}`, data);
    return res.data;
  }
};

export const operationsApi = {
  getLogs: async (params?: any) => {
    const res = await client.get('/operations/logs', { params });
    return res.data.logs || [];
  },
  summarize: async (data?: any) => {
    const res = await client.post('/operations/summarize', data || {});
    return res.data;
  }
};

export const knowledgeApi = {
  listDocuments: async () => {
    const res = await client.get('/knowledge/documents');
    return res.data;
  },
  search: async (query: string, topK: number = 4) => {
    const res = await client.post('/knowledge/search', { query, top_k: topK });
    return res.data.results || [];
  },
  ingest: async (data: any) => {
    const res = await client.post('/knowledge/ingest', data);
    return res.data;
  },
  uploadDocument: async (file: File, meta: { category: string; visibility: string; role?: string }) => {
    // Send ingestion metadata and filename to backend ingest endpoint
    const title = file.name.replace(/\.[^/.]+$/, '');
    const res = await client.post('/knowledge/ingest', {
      document_id: `DOC_${Date.now()}`,
      title: file.name,
      utility: meta.category === 'Tariff Schedule' ? 'Electricity' : 'General Utility',
      scope: meta.visibility.toLowerCase(),
      version: '1.0',
      text_content: `Ingested utility operational standard operating procedure: ${file.name}. Category: ${meta.category}. Target Audience: ${meta.visibility}. File Size: ${(file.size / 1024).toFixed(1)} KB.`
    });
    return res.data;
  },
  delete: async (id: string) => {
    const res = await client.delete(`/knowledge/documents/${id}`);
    return res.data;
  }
};

export const adminApi = {
  listUsers: async (limit: number = 50): Promise<User[]> => {
    const res = await client.get('/admin/users', { params: { limit } });
    return res.data.users || [];
  },
  listAuditLogs: async (limit: number = 100): Promise<AuditLog[]> => {
    const res = await client.get('/admin/audit-logs', { params: { limit } });
    return res.data.logs || [];
  }
};
