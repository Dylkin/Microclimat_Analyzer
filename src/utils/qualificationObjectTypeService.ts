import { apiClient } from './apiClient';

export interface QualificationObjectType {
  id: string;
  type_key: string;
  type_label: string;
  description?: string;
  protocol_template_url?: string;
  protocol_template_filename?: string;
  protocol_template_uploaded_at?: string;
  protocol_template_uploaded_by?: string;
  protocol_template_uploaded_by_name?: string;
  report_template_url?: string;
  report_template_filename?: string;
  report_template_uploaded_at?: string;
  report_template_uploaded_by?: string;
  report_template_uploaded_by_name?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateQualificationObjectTypeData {
  type_label?: string;
  description?: string;
  updated_by?: string;
}

class QualificationObjectTypeService {
  isAvailable(): boolean {
    return true;
  }

  // Получить все типы объектов квалификации
  async getAllTypes(): Promise<QualificationObjectType[]> {
    try {
      const data = await apiClient.get<QualificationObjectType[]>('/qualification-object-types');
      return data || [];
    } catch (error: any) {
      throw new Error(`Ошибка получения типов объектов квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получить тип объекта квалификации по ID
  async getTypeById(id: string): Promise<QualificationObjectType> {
    try {
      const data = await apiClient.get<QualificationObjectType>(`/qualification-object-types/${id}`);
      return data;
    } catch (error: any) {
      throw new Error(`Ошибка получения типа объекта квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получить тип объекта квалификации по type_key
  async getTypeByKey(typeKey: string): Promise<QualificationObjectType> {
    try {
      const data = await apiClient.get<QualificationObjectType>(`/qualification-object-types/by-key/${typeKey}`);
      return data;
    } catch (error: any) {
      throw new Error(`Ошибка получения типа объекта квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Обновить тип объекта квалификации
  async updateType(id: string, data: UpdateQualificationObjectTypeData): Promise<QualificationObjectType> {
    try {
      const result = await apiClient.put<QualificationObjectType>(`/qualification-object-types/${id}`, data);
      return result;
    } catch (error: any) {
      throw new Error(`Ошибка обновления типа объекта квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Загрузить шаблон протокола
  async uploadProtocolTemplate(id: string, file: File, userId?: string, userName?: string): Promise<{ success: boolean; protocol_template_url: string; protocol_template_filename: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (userId) {
        formData.append('uploaded_by', userId);
      }
      if (userName) {
        formData.append('uploaded_by_name', userName);
      }

      const result = await apiClient.post<{ success: boolean; protocol_template_url: string; protocol_template_filename: string }>(
        `/qualification-object-types/${id}/protocol-template`,
        formData
      );
      return result;
    } catch (error: any) {
      throw new Error(`Ошибка загрузки шаблона протокола: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Загрузить шаблон отчета
  async uploadReportTemplate(id: string, file: File, userId?: string, userName?: string): Promise<{ success: boolean; report_template_url: string; report_template_filename: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (userId) {
        formData.append('uploaded_by', userId);
      }
      if (userName) {
        formData.append('uploaded_by_name', userName);
      }

      const result = await apiClient.post<{ success: boolean; report_template_url: string; report_template_filename: string }>(
        `/qualification-object-types/${id}/report-template`,
        formData
      );
      return result;
    } catch (error: any) {
      throw new Error(`Ошибка загрузки шаблона отчета: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Удалить шаблон протокола
  async deleteProtocolTemplate(id: string): Promise<void> {
    try {
      await apiClient.delete(`/qualification-object-types/${id}/protocol-template`);
    } catch (error: any) {
      throw new Error(`Ошибка удаления шаблона протокола: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Удалить шаблон отчета
  async deleteReportTemplate(id: string): Promise<void> {
    try {
      await apiClient.delete(`/qualification-object-types/${id}/report-template`);
    } catch (error: any) {
      throw new Error(`Ошибка удаления шаблона отчета: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Скачать файл шаблона
  async downloadTemplate(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Ошибка загрузки файла');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      throw new Error(`Ошибка скачивания файла: ${error.message || 'Неизвестная ошибка'}`);
    }
  }
}

export const qualificationObjectTypeService = new QualificationObjectTypeService();

