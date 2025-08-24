import { createClient } from '@supabase/supabase-js';
import { 
  MeasurementEquipment, 
  EquipmentVerification,
  CreateMeasurementEquipmentData, 
  UpdateMeasurementEquipmentData,
  CreateEquipmentVerificationData,
  DatabaseMeasurementEquipment,
  DatabaseEquipmentVerification
} from '../types/MeasurementEquipment';

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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка получения измерительного оборудования:', error);
        throw new Error(`Ошибка получения измерительного оборудования: ${error.message}`);
      }

      // Получаем все записи о поверках
      const { data: verificationsData, error: verificationsError } = await this.supabase
        .from('equipment_verifications')
        .select('*')
        .order('verification_end_date', { ascending: false });

      if (verificationsError) {
        console.error('Ошибка получения записей о поверках:', verificationsError);
      }

      // Группируем поверки по оборудованию
      const verificationsByEquipment = new Map<string, EquipmentVerification[]>();
      verificationsData?.forEach((verification: DatabaseEquipmentVerification) => {
        if (!verificationsByEquipment.has(verification.equipment_id)) {
          verificationsByEquipment.set(verification.equipment_id, []);
        }
        verificationsByEquipment.get(verification.equipment_id)!.push({
          id: verification.id,
          equipmentId: verification.equipment_id,
          verificationStartDate: new Date(verification.verification_start_date),
          verificationEndDate: new Date(verification.verification_end_date),
          verificationFileUrl: verification.verification_file_url || undefined,
          verificationFileName: verification.verification_file_name || undefined,
          createdAt: new Date(verification.created_at)
        });
      });

      console.log('Загружено единиц оборудования:', data?.length || 0);

      return data.map((equipment: DatabaseMeasurementEquipment) => ({
        id: equipment.id,
        type: equipment.type,
        name: equipment.name,
        serialNumber: equipment.serial_number,
        createdAt: new Date(equipment.created_at),
        updatedAt: new Date(equipment.updated_at),
        verifications: verificationsByEquipment.get(equipment.id) || []
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
          serial_number: equipmentData.serialNumber
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
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        verifications: []
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
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        verifications: [] // Будет загружено отдельно при необходимости
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

  // Добавление записи о поверке
  async addVerification(verificationData: CreateEquipmentVerificationData): Promise<EquipmentVerification> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Добавляем запись о поверке:', verificationData);

      let fileUrl: string | undefined;
      let fileName: string | undefined;

      // Загружаем файл если он есть
      if (verificationData.verificationFile) {
        const fileResult = await this.uploadVerificationFile(
          verificationData.verificationFile,
          verificationData.equipmentId
        );
        if (fileResult) {
          fileUrl = fileResult.url;
          fileName = fileResult.fileName;
        }
      }

      const { data, error } = await this.supabase
        .from('equipment_verifications')
        .insert({
          equipment_id: verificationData.equipmentId,
          verification_start_date: verificationData.verificationStartDate.toISOString().split('T')[0],
          verification_end_date: verificationData.verificationEndDate.toISOString().split('T')[0],
          verification_file_url: fileUrl || null,
          verification_file_name: fileName || null
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка добавления записи о поверке:', error);
        throw new Error(`Ошибка добавления записи о поверке: ${error.message}`);
      }

      console.log('Запись о поверке успешно добавлена:', data);

      return {
        id: data.id,
        equipmentId: data.equipment_id,
        verificationStartDate: new Date(data.verification_start_date),
        verificationEndDate: new Date(data.verification_end_date),
        verificationFileUrl: data.verification_file_url || undefined,
        verificationFileName: data.verification_file_name || undefined,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Ошибка при добавлении записи о поверке:', error);
      throw error;
    }
  }

  // Удаление записи о поверке
  async deleteVerification(verificationId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await this.supabase
        .from('equipment_verifications')
        .delete()
        .eq('id', verificationId);

      if (error) {
        console.error('Ошибка удаления записи о поверке:', error);
        throw new Error(`Ошибка удаления записи о поверке: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении записи о поверке:', error);
      throw error;
    }
  }

  // Загрузка файла поверки (заглушка - в реальном проекте нужно настроить Supabase Storage)
  private async uploadVerificationFile(file: File, equipmentId: string): Promise<{ url: string; fileName: string } | null> {
    try {
      // В реальном проекте здесь должна быть загрузка в Supabase Storage
      // Пока возвращаем заглушку
      console.log('Загрузка файла поверки (заглушка):', file.name);
      
      // Создаем временный URL для демонстрации
      const tempUrl = URL.createObjectURL(file);
      
      return {
        url: tempUrl,
        fileName: file.name
      };
    } catch (error) {
      console.error('Ошибка загрузки файла поверки:', error);
      return null;
    }
  }
}

// Экспорт синглтона сервиса
export const measurementEquipmentService = new MeasurementEquipmentService();