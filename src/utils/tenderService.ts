import { apiClient } from './apiClient';
import { TenderSearchSettings, Tender, TenderSearchHistory } from '../types/Tender';

class TenderService {
  isAvailable(): boolean {
    return !!apiClient;
  }

  // Получить настройки поиска
  async getSearchSettings(userId: string): Promise<TenderSearchSettings | null> {
    try {
      return await apiClient.get<TenderSearchSettings | null>(`/tenders/settings?userId=${userId}`);
    } catch (error: any) {
      console.error('Ошибка получения настроек поиска:', error);
      throw new Error(`Ошибка получения настроек поиска: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Сохранить настройки поиска
  async saveSearchSettings(settings: TenderSearchSettings): Promise<TenderSearchSettings> {
    try {
      const payload = {
        userId: settings.userId,
        purchaseItems: Array.isArray(settings.purchaseItems) ? settings.purchaseItems : (settings.purchaseItems ? [settings.purchaseItems] : []),
        organizationUnps: Array.isArray(settings.organizationUnps) ? settings.organizationUnps : (settings.organizationUnps ? [settings.organizationUnps] : [])
      };
      
      console.log('Отправка данных на сервер:', payload);
      
      const result = await apiClient.post<TenderSearchSettings>('/tenders/settings', payload);
      
      console.log('Настройки успешно сохранены:', result);
      return result;
    } catch (error: any) {
      console.error('Ошибка сохранения настроек поиска:', error);
      console.error('Детали ошибки:', {
        message: error.message,
        stack: error.stack
      });
      throw new Error(`Ошибка сохранения настроек поиска: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получить найденные тендеры
  async getTenders(userId?: string, searchSettingsId?: string): Promise<Tender[]> {
    try {
      let url = '/tenders';
      const params: string[] = [];
      
      if (userId) {
        params.push(`userId=${userId}`);
      }
      if (searchSettingsId) {
        params.push(`searchSettingsId=${searchSettingsId}`);
      }
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      const data = await apiClient.get<Tender[]>(url);
      
      return data.map(tender => ({
        ...tender,
        publicationDate: new Date(tender.publicationDate),
        deadlineDate: tender.deadlineDate ? new Date(tender.deadlineDate) : undefined,
        parsedAt: new Date(tender.parsedAt)
      }));
    } catch (error: any) {
      console.error('Ошибка получения тендеров:', error);
      throw new Error(`Ошибка получения тендеров: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Сохранить найденные тендеры
  async saveTenders(searchSettingsId: string, tenders: Tender[]): Promise<Tender[]> {
    try {
      const data = await apiClient.post<Tender[]>('/tenders', {
        searchSettingsId,
        tenders: tenders.map(tender => ({
          tenderNumber: tender.tenderNumber,
          title: tender.title,
          organizationName: tender.organizationName,
          organizationUnp: tender.organizationUnp,
          purchaseItem: tender.purchaseItem,
          publicationDate: tender.publicationDate.toISOString().split('T')[0],
          deadlineDate: tender.deadlineDate ? tender.deadlineDate.toISOString().split('T')[0] : null,
          tenderUrl: tender.tenderUrl,
          status: tender.status
        }))
      });
      
      return data.map(tender => ({
        ...tender,
        publicationDate: new Date(tender.publicationDate),
        deadlineDate: tender.deadlineDate ? new Date(tender.deadlineDate) : undefined,
        parsedAt: new Date(tender.parsedAt)
      }));
    } catch (error: any) {
      console.error('Ошибка сохранения тендеров:', error);
      throw new Error(`Ошибка сохранения тендеров: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получить историю поиска
  async getSearchHistory(userId: string): Promise<TenderSearchHistory[]> {
    try {
      const data = await apiClient.get<TenderSearchHistory[]>(`/tenders/history?userId=${userId}`);
      
      return data.map(history => ({
        ...history,
        searchDate: new Date(history.searchDate),
        searchSettings: {
          ...history.searchSettings,
          purchaseItems: history.searchSettings.purchaseItems || [],
          organizationUnps: history.searchSettings.organizationUnps || []
        }
      }));
    } catch (error: any) {
      console.error('Ошибка получения истории поиска:', error);
      throw new Error(`Ошибка получения истории поиска: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Сохранить запись в историю поиска
  async saveSearchHistory(history: Omit<TenderSearchHistory, 'id' | 'searchDate'>): Promise<TenderSearchHistory> {
    try {
      const data = await apiClient.post<TenderSearchHistory>('/tenders/history', {
        userId: history.userId,
        searchSettingsId: history.searchSettings.id,
        foundTendersCount: history.foundTendersCount,
        parsingStatus: history.parsingStatus,
        errorMessage: history.errorMessage
      });
      
      return {
        ...data,
        searchDate: new Date(data.searchDate),
        searchSettings: {
          ...data.searchSettings,
          purchaseItems: data.searchSettings.purchaseItems || [],
          organizationInns: data.searchSettings.organizationInns || []
        }
      };
    } catch (error: any) {
      console.error('Ошибка сохранения истории поиска:', error);
      throw new Error(`Ошибка сохранения истории поиска: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Парсинг тендеров с сайта goszakupki.by
  // ВНИМАНИЕ: Это заглушка. Реальный парсинг требует серверной реализации
  async parseTendersFromSite(settings: TenderSearchSettings): Promise<Tender[]> {
    // В реальной реализации здесь должен быть запрос к backend endpoint,
    // который будет парсить сайт goszakupki.by/tenders/posted
    // Для демонстрации возвращаем пустой массив
    console.warn('Парсинг тендеров с сайта требует серверной реализации');
    return [];
  }
}

export const tenderService = new TenderService();

