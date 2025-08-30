import { createClient } from '@supabase/supabase-js';
import { Equipment, EquipmentType, CreateEquipmentData, UpdateEquipmentData } from '../types/Equipment';

// Получаем конфигурацию Supabase из переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;

// Инициализация Supabase клиента
const initSupabase = () => {
  if (!supabase && supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
};

export interface DatabaseEquipment {
  id: string;
  type: EquipmentType;
  name: string;
  serial_number: string;
  created_at: string;
  updated_at: string;
}

export class EquipmentService {
  private supabase: any;

  constructor() {
    this.supabase = initSupabase();
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Получение всего оборудования с пагинацией
  async getAllEquipment(page: number = 1, limit: number = 10, searchTerm?: string): Promise<{
    equipment: Equipment[];
    total: number;
    totalPages: number;
  }> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      let query = this.supabase
        .from('measurement_equipment')
        .select('*', { count: 'exact' });

      // Применяем поиск если указан
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        query = query.or(`name.ilike.%${searchLower}%,serial_number.ilike.%${searchLower}%,type.ilike.%${searchLower}%`);
      }

      // Применяем пагинацию
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Ошибка получения оборудования:', error);
        throw new Error(`Ошибка получения оборудования: ${error.message}`);
      }

      const equipment = data.map((item: DatabaseEquipment) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        serialNumber: item.serial_number,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));

      return {
        equipment,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('Ошибка при получении оборудования:', error);
      throw error;
    }
  }

  // Добавление нового оборудования
  async addEquipment(equipmentData: CreateEquipmentData): Promise<Equipment> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Добавляем оборудование:', equipmentData);

      const { data, error } = await this.supabase
        .from('measurement_equipment')
        .insert({
          type: equipmentData.type,
          name: equipmentData.name,
          serial_number: equipmentData.serialNumber
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка добавления оборудования:', error);
        
        if (error.code === '23505') {
          if (error.message.includes('serial_number')) {
            throw new Error('Оборудование с таким серийным номером уже существует');
          }
          if (error.message.includes('name')) {
            throw new Error('Оборудование с таким наименованием уже существует');
          }
          throw new Error('Оборудование с такими данными уже существует');
        }
        
        throw new Error(`Ошибка добавления оборудования: ${error.message}`);
      }

      console.log('Оборудование успешно добавлено:', data);

      return {
        id: data.id,
        type: data.type,
        name: data.name,
        serialNumber: data.serial_number,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Ошибка при добавлении оборудования:', error);
      throw error;
    }
  }

  // Обновление оборудования
  async updateEquipment(id: string, updates: UpdateEquipmentData): Promise<Equipment> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const updateData: any = {};
      
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.serialNumber !== undefined) updateData.serial_number = updates.serialNumber;

      const { data, error } = await this.supabase
        .from('measurement_equipment')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Ошибка обновления оборудования:', error);
        
        if (error.code === '23505') {
          if (error.message.includes('serial_number')) {
            throw new Error('Оборудование с таким серийным номером уже существует');
          }
          if (error.message.includes('name')) {
            throw new Error('Оборудование с таким наименованием уже существует');
          }
          throw new Error('Оборудование с такими данными уже существует');
        }
        
        throw new Error(`Ошибка обновления оборудования: ${error.message}`);
      }

      return {
        id: data.id,
        type: data.type,
        name: data.name,
        serialNumber: data.serial_number,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Ошибка при обновлении оборудования:', error);
      throw error;
    }
  }

  // Удаление оборудования
  async deleteEquipment(id: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await this.supabase
        .from('measurement_equipment')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Ошибка удаления оборудования:', error);
        throw new Error(`Ошибка удаления оборудования: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении оборудования:', error);
      throw error;
    }
  }

  // Получение статистики оборудования
  async getEquipmentStats(): Promise<{
    total: number;
    byType: Record<EquipmentType, number>;
  }> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('measurement_equipment')
        .select('type');

      if (error) {
        console.error('Ошибка получения статистики:', error);
        throw new Error(`Ошибка получения статистики: ${error.message}`);
      }

      const stats = {
        total: data.length,
        byType: {
          '-': 0,
          'Testo 174T': 0,
          'Testo 174H': 0
        } as Record<EquipmentType, number>
      };

      data.forEach((item: { type: EquipmentType }) => {
        stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Ошибка при получении статистики:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const equipmentService = new EquipmentService();