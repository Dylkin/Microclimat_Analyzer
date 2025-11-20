import { apiClient } from './apiClient';
import { Contractor, ContractorContact, CreateContractorData, UpdateContractorData, GeocodeResult } from '../types/Contractor';

class ContractorService {
  // Проверка доступности API
  isAvailable(): boolean {
    return !!apiClient;
  }

  // Геокодирование адреса через OpenStreetMap Nominatim API
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!address.trim()) return null;

    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Ошибка геокодирования');
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          formattedAddress: result.display_name
        };
      }

      return null;
    } catch (error) {
      console.error('Ошибка геокодирования:', error);
      return null;
    }
  }

  // Получение всех контрагентов с контактами
  async getAllContractors(): Promise<Contractor[]> {
    try {
      console.log('Загружаем контрагентов...');
      const contractors = await apiClient.get<Contractor[]>('/contractors');
      console.log('Контрагенты загружены:', contractors.length);
      return contractors;
    } catch (error) {
      console.error('Ошибка получения контрагентов:', error);
      throw error;
    }
  }

  // Получение контрагента по ID с контактами
  async getContractorById(contractorId: string): Promise<Contractor> {
    try {
      console.log('Загружаем контрагента по ID:', contractorId);
      const contractor = await apiClient.get<Contractor>(`/contractors/${contractorId}`);
      return contractor;
    } catch (error) {
      console.error('Ошибка получения контрагента:', error);
      throw error;
    }
  }

  // Добавление нового контрагента
  async addContractor(contractorData: CreateContractorData): Promise<Contractor> {
    try {
      console.log('Добавляем контрагента:', contractorData);

      // Геокодируем адрес если он указан
      let geocodeResult: GeocodeResult | null = null;
      if (contractorData.address) {
        geocodeResult = await this.geocodeAddress(contractorData.address);
      }

      const contractor = await apiClient.post<Contractor>('/contractors', {
        name: contractorData.name,
        address: contractorData.address || null,
        contacts: contractorData.contacts || []
      });

      // Если геокодирование выполнено, обновляем координаты
      if (geocodeResult) {
        return await this.updateContractor(contractor.id, {
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          geocodedAt: new Date()
        });
      }

      console.log('Контрагент успешно добавлен:', contractor);
      return contractor;
    } catch (error) {
      console.error('Ошибка при добавлении контрагента:', error);
      throw error;
    }
  }

  // Обновление контрагента
  async updateContractor(id: string, updates: UpdateContractorData): Promise<Contractor> {
    try {
      // Если адрес изменился, выполняем геокодирование
      if (updates.address !== undefined && updates.address) {
        const geocodeResult = await this.geocodeAddress(updates.address);
        if (geocodeResult) {
          updates.latitude = geocodeResult.latitude;
          updates.longitude = geocodeResult.longitude;
          updates.geocodedAt = new Date();
        }
      }

      const contractor = await apiClient.put<Contractor>(`/contractors/${id}`, updates);
      return contractor;
    } catch (error) {
      console.error('Ошибка при обновлении контрагента:', error);
      throw error;
    }
  }

  // Удаление контрагента
  async deleteContractor(id: string): Promise<void> {
    try {
      await apiClient.delete(`/contractors/${id}`);
    } catch (error) {
      console.error('Ошибка при удалении контрагента:', error);
      throw error;
    }
  }

  // Добавление контакта к контрагенту
  async addContact(contractorId: string, contactData: Omit<ContractorContact, 'id' | 'contractorId' | 'createdAt'>): Promise<ContractorContact> {
    // Пока не реализовано на backend, возвращаем заглушку
    console.warn('addContact не реализован на backend');
    throw new Error('Функция добавления контакта не реализована на backend');
  }

  // Обновление контакта
  async updateContact(id: string, updates: Partial<Omit<ContractorContact, 'id' | 'contractorId' | 'createdAt'>>): Promise<ContractorContact> {
    // Пока не реализовано на backend, возвращаем заглушку
    console.warn('updateContact не реализован на backend');
    throw new Error('Функция обновления контакта не реализована на backend');
  }

  // Удаление контакта
  async deleteContact(id: string): Promise<void> {
    // Пока не реализовано на backend, возвращаем заглушку
    console.warn('deleteContact не реализован на backend');
    throw new Error('Функция удаления контакта не реализована на backend');
  }
}

// Экспорт синглтона сервиса
export const contractorService = new ContractorService();
