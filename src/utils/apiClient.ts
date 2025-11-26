// API клиент для работы с бэкендом вместо Supabase

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Типы для ответов API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface ApiError {
  message: string;
  details?: any;
}

// Класс для работы с API
class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Восстанавливаем токен из localStorage
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('auth_token');
    }
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {};
    
    // Не устанавливаем Content-Type для FormData, браузер установит его автоматически с boundary
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Добавляем пользовательские заголовки, если они есть
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: response.statusText,
        }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Обрабатываем пустые ответы (204 No Content)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      // Проверяем, есть ли контент для парсинга
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (text.trim() === '') {
          return undefined as T;
        }
        return JSON.parse(text);
      }

      // Если не JSON, возвращаем текст или пустой ответ
      const text = await response.text();
      return (text ? JSON.parse(text) : undefined) as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  // GET запрос
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST запрос
  async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    const headers: Record<string, string> = {};
    
    // Не устанавливаем Content-Type для FormData, браузер установит его автоматически с boundary
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      ...options,
      headers: {
        ...headers,
        ...(options?.headers as Record<string, string> || {}),
      },
    });
  }

  // PUT запрос
  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // PATCH запрос
  async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // DELETE запрос
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Загрузка файла
  async uploadFile(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {};

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText,
      }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Скачивание файла
  async downloadFile(endpoint: string): Promise<Blob> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {};

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.blob();
  }
}

// Экспортируем единый экземпляр
export const apiClient = new ApiClient();

// Экспортируем класс для создания дополнительных экземпляров
export default ApiClient;
