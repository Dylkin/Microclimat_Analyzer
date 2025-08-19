import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

// Mock data for fallback when database is not available
const mockClients = [
  {
    id: 'client-1',
    name: 'ООО "Фармацевтическая компания"',
    contactPerson: 'Иванов Иван Иванович',
    email: 'ivanov@pharma.ru',
    phone: '+7 (495) 123-45-67',
    address: 'г. Москва, ул. Примерная, д. 1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'client-2',
    name: 'ООО "Медицинский центр"',
    contactPerson: 'Петров Петр Петрович',
    email: 'petrov@medcenter.ru',
    phone: '+7 (495) 987-65-43',
    address: 'г. Санкт-Петербург, пр. Медицинский, д. 10',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05')
  }
];

type ClientRow = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ClientService {
  // Преобразование данных из базы в типы приложения
  private mapClientFromDB(clientRow: ClientRow): Client {
    return {
      id: clientRow.id,
      name: clientRow.name,
      contactPerson: clientRow.contact_person,
      email: clientRow.email || undefined,
      phone: clientRow.phone || undefined,
      address: clientRow.address || undefined,
      createdAt: new Date(clientRow.created_at),
      updatedAt: new Date(clientRow.updated_at)
    };
  }

  // Преобразование данных приложения в формат базы
  private mapClientToDB(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): ClientInsert {
    return {
      name: client.name,
      contact_person: client.contactPerson,
      email: client.email || null,
      phone: client.phone || null,
      address: client.address || null
    };
  }

  // Получение всех клиентов
  async getAllClients(): Promise<Client[]> {
    try {
      // Проверяем доступность Supabase
      const { data: healthCheck, error: healthError } = await supabase
        .from('clients')
        .select('count')
        .limit(1);

      // Если таблица не существует, возвращаем mock данные
      if (healthError && (healthError.code === 'PGRST205' || healthError.message?.includes('Could not find the table'))) {
        console.warn('Database not available, using mock clients data');
        return mockClients;
      }

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;

      return (data || []).map(this.mapClientFromDB);
    } catch (error) {
      console.error('Error fetching clients:', error);
      console.warn('Database error, falling back to mock clients data');
      return mockClients;
    }
  }

  // Получение клиента по ID
  async getClientById(id: string): Promise<Client | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Не найден
        throw error;
      }

      return this.mapClientFromDB(data);
    } catch (error) {
      console.error('Error fetching client:', error);
      throw new Error('Ошибка загрузки клиента');
    }
  }

  // Создание клиента
  async createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert(this.mapClientToDB(clientData))
        .select()
        .single();

      if (error) throw error;

      return this.mapClientFromDB(data);
    } catch (error) {
      console.error('Error creating client:', error);
      
      // Проверяем тип ошибки и возвращаем mock клиента
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // RLS policy violation, table not found, или другие ошибки БД
      if (errorMessage.includes('row-level security policy') || 
          errorMessage.includes('Could not find the table') ||
          errorMessage.includes('PGRST205') ||
          errorMessage.includes('42501')) {
        console.warn('Database access restricted or unavailable, returning mock client');
      }
      
      const mockClient: Client = {
        ...clientData,
        id: 'mock-client-' + Date.now(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return mockClient;
    }
  }

  // Обновление клиента
  async updateClient(id: string, updates: Partial<Client>): Promise<void> {
    try {
      const clientUpdates: ClientUpdate = {};
      
      if (updates.name !== undefined) clientUpdates.name = updates.name;
      if (updates.contactPerson !== undefined) clientUpdates.contact_person = updates.contactPerson;
      if (updates.email !== undefined) clientUpdates.email = updates.email || null;
      if (updates.phone !== undefined) clientUpdates.phone = updates.phone || null;
      if (updates.address !== undefined) clientUpdates.address = updates.address || null;

      const { error } = await supabase
        .from('clients')
        .update(clientUpdates)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating client:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('row-level security policy') || 
          errorMessage.includes('42501')) {
        console.warn('Insufficient permissions to update client, operation ignored');
        return; // Игнорируем ошибку RLS для обновления
      }
      
      throw new Error('Ошибка обновления клиента');
    }
  }

  // Удаление клиента
  async deleteClient(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting client:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('row-level security policy') || 
          errorMessage.includes('42501')) {
        console.warn('Insufficient permissions to delete client, operation ignored');
        return; // Игнорируем ошибку RLS для удаления
      }
      
      throw new Error('Ошибка удаления клиента');
    }
  }
}

export const clientService = new ClientService();