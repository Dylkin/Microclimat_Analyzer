import { createClient } from '@supabase/supabase-js';
import { Contractor, ContractorContact, CreateContractorData, UpdateContractorData, GeocodeResult } from '../types/Contractor';

// Получаем конфигурацию Supabase из переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;

// Инициализация Supabase клиента
const initSupabase = () => {
  if (!supabase && supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
};

export interface DatabaseContractor {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseContractorContact {
  id: string;
  contractor_id: string;
  employee_name: string;
  phone: string | null;
  comment: string | null;
  created_at: string;
}

export class ContractorService {
  private supabase: any;

  constructor() {
    this.supabase = initSupabase();
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
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
    if (!this.supabase) {
      console.warn('Supabase не настроен - возвращаем пустой массив');
      return [];
    }

    try {
      console.log('Загружаем контрагентов...');
      // Получаем контрагентов
      const { data: contractorsData, error: contractorsError } = await this.supabase
        .from('contractors')
        .select('*')
        .order('name', { ascending: true });

      if (contractorsError) {
        console.error('Ошибка получения контрагентов:', contractorsError);
        throw new Error(`Ошибка получения контрагентов: ${contractorsError.message}`);
      }

      console.log('Загружено контрагентов:', contractorsData?.length || 0);
      
      // Проверяем валидность UUID для всех контрагентов
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidContractors = contractorsData?.filter(c => !uuidRegex.test(c.id)) || [];
      
      if (invalidContractors.length > 0) {
        console.warn('Найдены контрагенты с некорректными ID:', invalidContractors);
      }

      // Получаем все контакты
      const { data: contactsData, error: contactsError } = await this.supabase
        .from('contractor_contacts')
        .select('*')
        .order('created_at', { ascending: true });

      if (contactsError) {
        console.error('Ошибка получения контактов:', contactsError);
        throw new Error(`Ошибка получения контактов: ${contactsError.message}`);
      }

      // Группируем контакты по контрагентам
      const contactsByContractor = new Map<string, ContractorContact[]>();
      contactsData?.forEach((contact: DatabaseContractorContact) => {
        if (!contactsByContractor.has(contact.contractor_id)) {
          contactsByContractor.set(contact.contractor_id, []);
        }
        contactsByContractor.get(contact.contractor_id)!.push({
          id: contact.id,
          contractorId: contact.contractor_id,
          employeeName: contact.employee_name,
          phone: contact.phone || undefined,
          comment: contact.comment || undefined,
          createdAt: new Date(contact.created_at)
        });
      });

      // Формируем результат
      return contractorsData.map((contractor: DatabaseContractor) => ({
        id: contractor.id,
        name: contractor.name,
        address: contractor.address || undefined,
        latitude: contractor.latitude || undefined,
        longitude: contractor.longitude || undefined,
        geocodedAt: contractor.geocoded_at ? new Date(contractor.geocoded_at) : undefined,
        createdAt: new Date(contractor.created_at),
        updatedAt: new Date(contractor.updated_at),
        contacts: contactsByContractor.get(contractor.id) || []
      }));
    } catch (error) {
      console.error('Ошибка при получении контрагентов:', error);
      // Возвращаем пустой массив вместо выброса ошибки
      console.warn('Возвращаем пустой массив контрагентов из-за ошибки подключения');
      return [];
    }
  }

  // Добавление нового контрагента
  async addContractor(contractorData: CreateContractorData): Promise<Contractor> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Добавляем контрагента:', contractorData);

      // Геокодируем адрес если он указан
      let geocodeResult: GeocodeResult | null = null;
      if (contractorData.address) {
        geocodeResult = await this.geocodeAddress(contractorData.address);
      }

      // Добавляем контрагента
      const { data: contractorResult, error: contractorError } = await this.supabase
        .from('contractors')
        .insert({
          name: contractorData.name,
          address: contractorData.address || null,
          latitude: geocodeResult?.latitude || null,
          longitude: geocodeResult?.longitude || null,
          geocoded_at: geocodeResult ? new Date().toISOString() : null
        })
        .select()
        .single();

      if (contractorError) {
        console.error('Ошибка добавления контрагента:', contractorError);
        throw new Error(`Ошибка добавления контрагента: ${contractorError.message}`);
      }

      // Добавляем контакты
      const contacts: ContractorContact[] = [];
      if (contractorData.contacts.length > 0) {
        const contactsToInsert = contractorData.contacts.map(contact => ({
          contractor_id: contractorResult.id,
          employee_name: contact.employeeName,
          phone: contact.phone || null,
          comment: contact.comment || null
        }));

        const { data: contactsResult, error: contactsError } = await this.supabase
          .from('contractor_contacts')
          .insert(contactsToInsert)
          .select();

        if (contactsError) {
          console.error('Ошибка добавления контактов:', contactsError);
          // Не прерываем выполнение, контрагент уже создан
        } else {
          contacts.push(...contactsResult.map((contact: DatabaseContractorContact) => ({
            id: contact.id,
            contractorId: contact.contractor_id,
            employeeName: contact.employee_name,
            phone: contact.phone || undefined,
            comment: contact.comment || undefined,
            createdAt: new Date(contact.created_at)
          })));
        }
      }

      console.log('Контрагент успешно добавлен:', contractorResult);

      return {
        id: contractorResult.id,
        name: contractorResult.name,
        address: contractorResult.address || undefined,
        latitude: contractorResult.latitude || undefined,
        longitude: contractorResult.longitude || undefined,
        geocodedAt: contractorResult.geocoded_at ? new Date(contractorResult.geocoded_at) : undefined,
        createdAt: new Date(contractorResult.created_at),
        updatedAt: new Date(contractorResult.updated_at),
        contacts
      };
    } catch (error) {
      console.error('Ошибка при добавлении контрагента:', error);
      throw error;
    }
  }

  // Обновление контрагента
  async updateContractor(id: string, updates: UpdateContractorData): Promise<Contractor> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.address !== undefined) {
        updateData.address = updates.address;
        
        // Если адрес изменился, выполняем геокодирование
        if (updates.address) {
          const geocodeResult = await this.geocodeAddress(updates.address);
          if (geocodeResult) {
            updateData.latitude = geocodeResult.latitude;
            updateData.longitude = geocodeResult.longitude;
            updateData.geocoded_at = new Date().toISOString();
          }
        } else {
          updateData.latitude = null;
          updateData.longitude = null;
          updateData.geocoded_at = null;
        }
      }
      if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
      if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
      if (updates.geocodedAt !== undefined) updateData.geocoded_at = updates.geocodedAt.toISOString();

      const { data, error } = await this.supabase
        .from('contractors')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Ошибка обновления контрагента:', error);
        throw new Error(`Ошибка обновления контрагента: ${error.message}`);
      }

      // Получаем контакты
      const { data: contactsData } = await this.supabase
        .from('contractor_contacts')
        .select('*')
        .eq('contractor_id', id)
        .order('created_at', { ascending: true });

      const contacts = contactsData?.map((contact: DatabaseContractorContact) => ({
        id: contact.id,
        contractorId: contact.contractor_id,
        employeeName: contact.employee_name,
        phone: contact.phone || undefined,
        comment: contact.comment || undefined,
        createdAt: new Date(contact.created_at)
      })) || [];

      return {
        id: data.id,
        name: data.name,
        address: data.address || undefined,
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
        geocodedAt: data.geocoded_at ? new Date(data.geocoded_at) : undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        contacts
      };
    } catch (error) {
      console.error('Ошибка при обновлении контрагента:', error);
      throw error;
    }
  }

  // Удаление контрагента
  async deleteContractor(id: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await this.supabase
        .from('contractors')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Ошибка удаления контрагента:', error);
        throw new Error(`Ошибка удаления контрагента: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении контрагента:', error);
      throw error;
    }
  }

  // Добавление контакта к контрагенту
  async addContact(contractorId: string, contactData: Omit<ContractorContact, 'id' | 'contractorId' | 'createdAt'>): Promise<ContractorContact> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('contractor_contacts')
        .insert({
          contractor_id: contractorId,
          employee_name: contactData.employeeName,
          phone: contactData.phone || null,
          comment: contactData.comment || null
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка добавления контакта:', error);
        throw new Error(`Ошибка добавления контакта: ${error.message}`);
      }

      return {
        id: data.id,
        contractorId: data.contractor_id,
        employeeName: data.employee_name,
        phone: data.phone || undefined,
        comment: data.comment || undefined,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Ошибка при добавлении контакта:', error);
      throw error;
    }
  }

  // Обновление контакта
  async updateContact(id: string, updates: Partial<Omit<ContractorContact, 'id' | 'contractorId' | 'createdAt'>>): Promise<ContractorContact> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const updateData: any = {};
      if (updates.employeeName !== undefined) updateData.employee_name = updates.employeeName;
      if (updates.phone !== undefined) updateData.phone = updates.phone || null;
      if (updates.comment !== undefined) updateData.comment = updates.comment || null;

      const { data, error } = await this.supabase
        .from('contractor_contacts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Ошибка обновления контакта:', error);
        throw new Error(`Ошибка обновления контакта: ${error.message}`);
      }

      return {
        id: data.id,
        contractorId: data.contractor_id,
        employeeName: data.employee_name,
        phone: data.phone || undefined,
        comment: data.comment || undefined,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Ошибка при обновлении контакта:', error);
      throw error;
    }
  }

  // Удаление контакта
  async deleteContact(id: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await this.supabase
        .from('contractor_contacts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Ошибка удаления контакта:', error);
        throw new Error(`Ошибка удаления контакта: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении контакта:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const contractorService = new ContractorService();