import axios from 'axios';
import { io } from 'socket.io-client';

const api = axios.create({ baseURL: '/api' });

// Attach JWT token to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('erp_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Socket.IO singleton
let socket = null;
export function getSocket() {
  if (!socket) {
    socket = io(window.location.origin, { autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return socket;
}
