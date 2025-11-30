// API клиент для работы с бэкендом вместо Supabase
// Базовый URL берём из переменных окружения VITE_API_URL или VITE_API_BASE_URL.
// По умолчанию используем '/api', чтобы в продакшене работать через Nginx reverse proxy,
// а не ходить на localhost:3001 из браузера пользователя.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api';

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

  private getUserId(): string | null {
    // Пытаемся получить userId из localStorage
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('currentUser');
      console.log('ApiClient.getUserId: currentUser из localStorage:', userStr);
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          console.log('ApiClient.getUserId: распарсенный user:', user);
          const userId = user?.id || null;
          if (!userId) {
            console.warn('ApiClient: userId не найден в объекте пользователя', user);
          } else {
            console.log('ApiClient.getUserId: найден userId:', userId);
          }
          return userId;
        } catch (error) {
          console.error('ApiClient: Ошибка парсинга currentUser из localStorage:', error, userStr);
          return null;
        }
      } else {
        console.warn('ApiClient: currentUser не найден в localStorage');
        // Проверяем все ключи в localStorage
        console.log('ApiClient: все ключи в localStorage:', Object.keys(localStorage));
      }
    }
    return null;
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

    // Добавляем userId в заголовок для аутентификации
    const userId = this.getUserId();
    if (userId) {
      headers['x-user-id'] = userId;
      // Также добавляем в других форматах для совместимости
      headers['X-User-Id'] = userId;
      headers['x-userid'] = userId;
      console.log('ApiClient.request: userId добавлен в заголовки', {
        userId,
        endpoint: url,
        method: options.method || 'GET',
        headers: Object.keys(headers)
      });
    } else {
      console.warn('ApiClient.request: userId не найден для запроса', {
        endpoint: url,
        method: options.method || 'GET',
        localStorage: typeof window !== 'undefined' ? localStorage.getItem('currentUser') : 'N/A'
      });
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
      const text = await response.text();
      
      if (text.trim() === '') {
        return undefined as T;
      }

      // Проверяем, что ответ действительно JSON, а не HTML
      if (contentType && contentType.includes('application/json')) {
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.error('Ошибка парсинга JSON:', parseError);
          console.error('Полученный ответ:', text.substring(0, 200));
          throw new Error(`Ошибка парсинга JSON ответа. Возможно, backend не запущен или прокси не настроен. Ответ начинается с: ${text.substring(0, 50)}`);
        }
      }

      // Если не JSON, но похоже на HTML - это ошибка
      if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
        console.error('Получен HTML вместо JSON. Возможно, backend не запущен или прокси не настроен.');
        console.error('URL запроса:', url);
        console.error('Ответ:', text.substring(0, 500));
        throw new Error('Backend не отвечает. Получен HTML вместо JSON. Убедитесь, что backend запущен на порту 3001.');
      }

      // Пытаемся распарсить как JSON, если это не HTML
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.warn('Не удалось распарсить ответ как JSON:', parseError);
        return undefined as T;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  // GET запрос
  async get<T>(endpoint: string): Promise<T> {
    // userId будет добавлен в заголовки в методе request()
    // Также добавляем в query для совместимости
    const userId = this.getUserId();
    let url = endpoint;
    if (userId && !endpoint.includes('userId=')) {
      const separator = endpoint.includes('?') ? '&' : '?';
      url = `${endpoint}${separator}userId=${encodeURIComponent(userId)}`;
      console.log('ApiClient.get: userId добавлен в query', { userId, url });
    } else if (!userId) {
      console.warn('ApiClient.get: userId не найден для запроса', {
        endpoint,
        localStorage: typeof window !== 'undefined' ? localStorage.getItem('currentUser') : 'N/A'
      });
    }
    return this.request<T>(url, { method: 'GET' });
  }

  // POST запрос
  async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    const headers: Record<string, string> = {};
    
    // Не устанавливаем Content-Type для FormData, браузер установит его автоматически с boundary
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // Добавляем userId в body, если его там нет
    let requestBody = body;
    if (!isFormData && requestBody && typeof requestBody === 'object') {
      const userId = this.getUserId();
      if (userId && !requestBody.userId) {
        requestBody = { ...requestBody, userId };
      }
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? body : (requestBody ? JSON.stringify(requestBody) : undefined),
      ...options,
      headers: {
        ...headers,
        ...(options?.headers as Record<string, string> || {}),
      },
    });
  }

  // PUT запрос
  async put<T>(endpoint: string, body?: any): Promise<T> {
    // Добавляем userId в body, если его там нет
    let requestBody = body;
    if (requestBody && typeof requestBody === 'object') {
      const userId = this.getUserId();
      if (userId && !requestBody.userId) {
        requestBody = { ...requestBody, userId };
      }
    }

    return this.request<T>(endpoint, {
      method: 'PUT',
      body: requestBody ? JSON.stringify(requestBody) : undefined,
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
