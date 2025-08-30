import { createClient } from '@supabase/supabase-js';
import { MeasurementEquipment, EquipmentType, CreateMeasurementEquipmentData, UpdateMeasurementEquipmentData } from '../types/MeasurementEquipment';

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

export interface DatabaseMeasurementEquipment {
  id: string;
  type: EquipmentType;
  name: string;
  serial_number: string;
  created_at: string;
  updated_at: string;
}

export class MeasurementEquipmentService {
  private supabase: any;

  constructor() {
    this.supabase = initSupabase();
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Получение всего измерительного оборудования
  async getAllEquipment(): Promise<MeasurementEquipment[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('measurement_equipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка получения измерительного оборудования:', error);
        throw new Error(`Ошибка получения оборудования: ${error.message}`);
      }

      return data.map((equipment: DatabaseMeasurementEquipment) => ({
        id: equipment.id,
        type: equipment.type,
        name: equipment.name,
        serialNumber: equipment.serial_number,
        createdAt: new Date(equipment.created_at),
        updatedAt: new Date(equipment.updated_at)
      }));
    } catch (error) {
      console.error('Ошибка при получении измерительного оборудования:', error);
      throw error;
    }
  }

  // Добавление нового оборудования
  async addEquipment(equipmentData: CreateMeasurementEquipmentData): Promise<MeasurementEquipment> {
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
          throw new Error('Оборудование с таким серийным номером уже существует');
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
  async updateEquipment(id: string, updates: UpdateMeasurementEquipmentData): Promise<MeasurementEquipment> {
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
          throw new Error('Оборудование с таким серийным номером уже существует');
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
}

// Экспорт синглтона сервиса
export const measurementEquipmentService = new MeasurementEquipmentService();