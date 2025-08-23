import { createClient } from '@supabase/supabase-js';
import { 
  MeasurementEquipment, 
  CreateMeasurementEquipmentData, 
  UpdateMeasurementEquipmentData,
  DatabaseMeasurementEquipment 
} from '../types/MeasurementEquipment';

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
      console.warn('Supabase не настроен - возвращаем пустой массив');
      return [];
    }

    try {
      console.log('Загружаем измерительное оборудование...');
      
      const { data, error } = await this.supabase
        .from('measurement_equipment')
        .select('*')
        .order('verification_due_date', { ascending: true });

      if (error) {
        console.error('Ошибка получения измерительного оборудования:', error);
        throw new Error(`Ошибка получения измерительного оборудования: ${error.message}`);
      }

      console.log('Загружено единиц оборудования:', data?.length || 0);

      return data.map((equipment: DatabaseMeasurementEquipment) => ({
        id: equipment.id,
        type: equipment.type,
        name: equipment.name,
        serialNumber: equipment.serial_number,
        verificationDueDate: new Date(equipment.verification_due_date),
        createdAt: new Date(equipment.created_at),
        updatedAt: new Date(equipment.updated_at)
      }));
    } catch (error) {
      console.error('Ошибка при получении измерительного оборудования:', error);
      return [];
    }
  }

  // Добавление нового оборудования
  async addEquipment(equipmentData: CreateMeasurementEquipmentData): Promise<MeasurementEquipment> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Добавляем измерительное оборудование:', equipmentData);

      const { data, error } = await this.supabase
        .from('measurement_equipment')
        .insert({
          type: equipmentData.type,
          name: equipmentData.name,
          serial_number: equipmentData.serialNumber,
          verification_due_date: equipmentData.verificationDueDate.toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка добавления измерительного оборудования:', error);
        if (error.code === '23505') {
          throw new Error('Оборудование с таким серийным номером уже существует');
        }
        throw new Error(`Ошибка добавления измерительного оборудования: ${error.message}`);
      }

      console.log('Измерительное оборудование успешно добавлено:', data);

      return {
        id: data.id,
        type: data.type,
        name: data.name,
        serialNumber: data.serial_number,
        verificationDueDate: new Date(data.verification_due_date),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Ошибка при добавлении измерительного оборудования:', error);
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
      if (updates.verificationDueDate !== undefined) {
        updateData.verification_due_date = updates.verificationDueDate.toISOString().split('T')[0];
      }

      const { data, error } = await this.supabase
        .from('measurement_equipment')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Ошибка обновления измерительного оборудования:', error);
        if (error.code === '23505') {
          throw new Error('Оборудование с таким серийным номером уже существует');
        }
        throw new Error(`Ошибка обновления измерительного оборудования: ${error.message}`);
      }

      return {
        id: data.id,
        type: data.type,
        name: data.name,
        serialNumber: data.serial_number,
        verificationDueDate: new Date(data.verification_due_date),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Ошибка при обновлении измерительного оборудования:', error);
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
        console.error('Ошибка удаления измерительного оборудования:', error);
        throw new Error(`Ошибка удаления измерительного оборудования: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении измерительного оборудования:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const measurementEquipmentService = new MeasurementEquipmentService();