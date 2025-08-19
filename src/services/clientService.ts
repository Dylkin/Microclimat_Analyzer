import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

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
  inn?: string;
  kpp?: string;
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
      inn: clientRow.inn || undefined,
      kpp: clientRow.kpp || undefined,
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
      address: client.address || null,
      inn: client.inn || null,
      kpp: client.kpp || null
    };
  }

  // Получение всех клиентов
  async getAllClients(): Promise<Client[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;

      return (data || []).map(this.mapClientFromDB);
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw new Error('Ошибка загрузки клиентов');
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
      throw new Error('Ошибка создания клиента');
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
      if (updates.inn !== undefined) clientUpdates.inn = updates.inn || null;
      if (updates.kpp !== undefined) clientUpdates.kpp = updates.kpp || null;

      const { error } = await supabase
        .from('clients')
        .update(clientUpdates)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating client:', error);
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
      throw new Error('Ошибка удаления клиента');
    }
  }
}

export const clientService = new ClientService();