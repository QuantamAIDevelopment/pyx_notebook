import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const createSession = async (data) => {
  const response = await api.post('/session', {
    action: 'create_session',
    data
  });
  return response.data;
};

export const loadNotebook = async (sessionId) => {
  const response = await api.get(`/notebook/${sessionId}`);
  return response.data;
};

export const saveNotebook = async (sessionId, data) => {
  const response = await api.post(`/notebook/${sessionId}`, {
    action: 'save_notebook',
    data
  });
  return response.data;
};

export const runCell = async (sessionId, data) => {
  const response = await api.post(`/notebook/${sessionId}`, {
    action: 'run_cell',
    data
  });
  return response.data;
};

export const createCell = async (sessionId, data) => {
  const response = await api.post(`/notebook/${sessionId}`, {
    action: 'create_cell',
    data
  });
  return response.data;
};

export const updateCell = async (sessionId, data) => {
  const response = await api.post(`/notebook/${sessionId}`, {
    action: 'update_cell',
    data
  });
  return response.data;
};

export const deleteCell = async (sessionId, data) => {
  const response = await api.post(`/notebook/${sessionId}`, {
    action: 'delete_cell',
    data
  });
  return response.data;
};