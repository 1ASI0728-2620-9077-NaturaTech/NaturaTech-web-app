import axios, { type AxiosInstance } from 'axios';
import { registerRequestInterceptor } from './request.interceptor';
import { registerResponseInterceptor } from './response.interceptor';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'https://plantsync-backend-a8c5cbd9c5bggfg3.mexicocentral-01.azurewebsites.net/api/v1';

const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Register request interceptor (attaches Bearer token)
registerRequestInterceptor(http);

// Register response interceptor (handles 401, 403, 404, 400 errors)
registerResponseInterceptor(http);

export default http;
