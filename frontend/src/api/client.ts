import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api' });
export const post = async <T>(url: string) => (await api.post<T>(url)).data;
export const get = async <T>(url: string) => (await api.get<T>(url)).data;
export const put = async <T>(url: string, data: unknown) => (await api.put<T>(url, data)).data;
