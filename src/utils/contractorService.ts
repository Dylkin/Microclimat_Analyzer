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
      const contractors = await apiClient.get<any[]>('/contractors');
      console.log('Контрагенты загружены:', contractors.length);
      
      // Преобразуем даты из строк в Date объекты
      return contractors.map(contractor => ({
        ...contractor,
        createdAt: contractor.createdAt ? new Date(contractor.createdAt) : new Date(),
        updatedAt: contractor.updatedAt ? new Date(contractor.updatedAt) : new Date(),
        contacts: (contractor.contacts || []).map((contact: any) => ({
          ...contact,
          createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date()
        }))
      }));
    } catch (error) {
      console.error('Ошибка получения контрагентов:', error);
      throw error;
    }
  }

  // Получение контрагента по ID с контактами
  async getContractorById(contractorId: string): Promise<Contractor> {
    try {
      console.log('Загружаем контрагента по ID:', contractorId);
      const contractor = await apiClient.get<any>(`/contractors/${contractorId}`);
      
      // Преобразуем даты из строк в Date объекты
      return {
        ...contractor,
        createdAt: contractor.createdAt ? new Date(contractor.createdAt) : new Date(),
        updatedAt: contractor.updatedAt ? new Date(contractor.updatedAt) : new Date(),
        contacts: (contractor.contacts || []).map((contact: any) => ({
          ...contact,
          createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date()
        }))
      };
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

      const contractor = await apiClient.post<any>('/contractors', {
        name: contractorData.name,
        address: contractorData.address || null,
        role: contractorData.role && contractorData.role.length > 0 ? contractorData.role : null,
        // Теги пока не поддерживаются на бэкенде явно, но можем отправлять их для будущей совместимости
        tags: contractorData.tags && contractorData.tags.length > 0 ? contractorData.tags : undefined,
        contacts: (contractorData.contacts || []).map(contact => ({
          employeeName: contact.employeeName,
          phone: contact.phone || null,
          comment: contact.comment || null
        }))
      });

      // Преобразуем даты из строк в Date объекты
      const mappedContractor: Contractor = {
        ...contractor,
        createdAt: contractor.createdAt ? new Date(contractor.createdAt) : new Date(),
        updatedAt: contractor.updatedAt ? new Date(contractor.updatedAt) : new Date(),
        contacts: (contractor.contacts || []).map((contact: any) => ({
          ...contact,
          createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date()
        }))
      };

      // Если геокодирование выполнено, обновляем координаты
      if (geocodeResult) {
        return await this.updateContractor(mappedContractor.id, {
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          geocodedAt: new Date()
        });
      }

      console.log('Контрагент успешно добавлен:', mappedContractor);
      return mappedContractor;
    } catch (error) {
      console.error('Ошибка при добавлении контрагента:', error);
      throw error;
    }
  }

  // Обновление контрагента
  async updateContractor(id: string, updates: UpdateContractorData): Promise<Contractor> {
    try {
      const contractor = await apiClient.put<any>(`/contractors/${id}`, updates);
      
      // Преобразуем даты из строк в Date объекты
      return {
        ...contractor,
        createdAt: contractor.createdAt ? new Date(contractor.createdAt) : new Date(),
        updatedAt: contractor.updatedAt ? new Date(contractor.updatedAt) : new Date(),
        contacts: (contractor.contacts || []).map((contact: any) => ({
          ...contact,
          createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date()
        }))
      };
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
    try {
      const contact = await apiClient.post<any>(`/contractors/${contractorId}/contacts`, {
        employeeName: contactData.employeeName,
        phone: contactData.phone || null,
        comment: contactData.comment || null
      });

      return {
        id: contact.id,
        contractorId: contact.contractorId || contact.contractor_id,
        employeeName: contact.employeeName || contact.employee_name,
        phone: contact.phone || undefined,
        comment: contact.comment || undefined,
        createdAt: contact.createdAt ? new Date(contact.createdAt) : (contact.created_at ? new Date(contact.created_at) : new Date())
      };
    } catch (error: any) {
      console.error('Ошибка при добавлении контакта:', error);
      throw new Error(`Ошибка добавления контакта: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Обновление контакта
  async updateContact(id: string, updates: Partial<Omit<ContractorContact, 'id' | 'contractorId' | 'createdAt'>>): Promise<ContractorContact> {
    try {
      const contact = await apiClient.put<any>(`/contractors/contacts/${id}`, {
        employeeName: updates.employeeName,
        phone: updates.phone,
        comment: updates.comment
      });

      return {
        id: contact.id,
        contractorId: contact.contractorId || contact.contractor_id,
        employeeName: contact.employeeName || contact.employee_name,
        phone: contact.phone || undefined,
        comment: contact.comment || undefined,
        createdAt: contact.createdAt ? new Date(contact.createdAt) : (contact.created_at ? new Date(contact.created_at) : new Date())
      };
    } catch (error: any) {
      console.error('Ошибка при обновлении контакта:', error);
      throw new Error(`Ошибка обновления контакта: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Удаление контакта
  async deleteContact(id: string): Promise<void> {
    try {
      await apiClient.delete(`/contractors/contacts/${id}`);
    } catch (error: any) {
      console.error('Ошибка при удалении контакта:', error);
      throw new Error(`Ошибка удаления контакта: ${error.message || 'Неизвестная ошибка'}`);
    }
  }
}

// Экспорт синглтона сервиса
export const contractorService = new ContractorService();
