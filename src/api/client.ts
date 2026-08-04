import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1', 
  withCredentials: true, 
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const csrfToken = localStorage.getItem('csrf_token');
  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method ?? '')) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});