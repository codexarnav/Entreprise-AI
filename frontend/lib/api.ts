import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear localStorage and redirect to login if token is invalid
      localStorage.removeItem('token');
      localStorage.removeItem('session_id');
      localStorage.removeItem('user_id');
      localStorage.removeItem('role');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export const executeWorkflow = async (prompt: string, session_id?: string, file_path?: string, url?: string) => {
  const { data } = await api.post('/execute', { prompt, session_id, file_path, url });
  return data;
};

export const getWorkflowStatus = async (workflow_id: string) => {
  const { data } = await api.get(`/workflow/${workflow_id}`);
  return data;
};

export const getAuditLogs = async (workflow_id: string) => {
  const { data } = await api.get(`/workflow/${workflow_id}/audit`);
  return data;
};

export const resumeWorkflow = async (workflow_id: string, inputs: any) => {
  const { data } = await api.post(`/workflow/${workflow_id}/resume`, { inputs });
  return data;
};

export const approveWorkflow = async (workflow_id: string, approval: string, notes?: string) => {
  const { data } = await api.post(`/workflow/${workflow_id}/approve`, { approval, notes });
  return data;
};

export default api;
