import { supabase } from './supabaseClient';
import { Equipment, EquipmentType, CreateEquipmentData, UpdateEquipmentData, EquipmentVerification } from '../types/Equipment';

interface DatabaseEquipment {
  id: string;
  type: EquipmentType;
  name: string;
  serial_number: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseEquipmentVerification {
  id: string;
  equipment_id: string;
  verification_start_date: string;
  verification_end_date: string;
  verification_file_url: string | null;
  verification_file_name: string | null;
  created_at: string;
}

class EquipmentService {
  private supabase: any;

  constructor() {
    this.supabase = supabase;
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Получение всего оборудования с пагинацией
  async getAllEquipment(page: number = 1, limit: number = 10, searchTerm?: string, sortOrder: 'asc' | 'desc' = 'asc'): Promise<{
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
        .select(`
          *,
          equipment_verifications (
            id,
            verification_start_date,
            verification_end_date,
            verification_file_url,
            verification_file_name,
            created_at
          )
        `, { count: 'exact' });

      // Применяем поиск если указан
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        query = query.or(`name.ilike.%${searchLower}%,serial_number.ilike.%${searchLower}%`);
      }

      // Применяем пагинацию
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const { data, error, count } = await query
        .order('name', { ascending: sortOrder === 'asc' })
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
        updatedAt: new Date(item.updated_at),
        verifications: (item as any).equipment_verifications?.map((verification: DatabaseEquipmentVerification) => ({
          id: verification.id,
          equipmentId: verification.equipment_id,
          verificationStartDate: new Date(verification.verification_start_date),
          verificationEndDate: new Date(verification.verification_end_date),
          verificationFileUrl: verification.verification_file_url || undefined,
          verificationFileName: verification.verification_file_name || undefined,
          createdAt: new Date(verification.created_at)
        })) || []
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

      const newEquipment = {
        id: data.id,
        type: data.type,
        name: data.name,
        serialNumber: data.serial_number,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        verifications: []
      };

      // Добавляем аттестации если они есть
      if (equipmentData.verifications && equipmentData.verifications.length > 0) {
        for (const verification of equipmentData.verifications) {
          await this.addVerification(data.id, verification);
        }
        
        // Перезагружаем оборудование с аттестациями
        const result = await this.getAllEquipment(1, 1, data.name);
        return result.equipment[0] || newEquipment;
      }

      return newEquipment;
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

      const updatedEquipment = {
        id: data.id,
        type: data.type,
        name: data.name,
        serialNumber: data.serial_number,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        verifications: []
      };

      // Обновляем аттестации если они есть
      if (updates.verifications !== undefined) {
        // Удаляем старые аттестации
        await this.supabase
          .from('equipment_verifications')
          .delete()
          .eq('equipment_id', id);

        // Добавляем новые аттестации
        for (const verification of updates.verifications) {
          await this.addVerification(id, verification);
        }
        
        // Перезагружаем оборудование с аттестациями
        const result = await this.getAllEquipment(1, 1, data.name);
        return result.equipment[0] || updatedEquipment;
      }

      return updatedEquipment;
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

  // Добавление аттестации
  async addVerification(equipmentId: string, verification: Omit<EquipmentVerification, 'id' | 'equipmentId' | 'createdAt'>): Promise<EquipmentVerification> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('equipment_verifications')
        .insert({
          equipment_id: equipmentId,
          verification_start_date: verification.verificationStartDate.toISOString().split('T')[0],
          verification_end_date: verification.verificationEndDate.toISOString().split('T')[0],
          verification_file_url: verification.verificationFileUrl || null,
          verification_file_name: verification.verificationFileName || null
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка добавления аттестации:', error);
        throw new Error(`Ошибка добавления аттестации: ${error.message}`);
      }

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
      console.error('Ошибка при добавлении аттестации:', error);
      throw error;
    }
  }

  // Загрузка файла аттестации
  async uploadVerificationFile(equipmentId: string, verificationId: string, file: File): Promise<string> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const fileName = `verifications/${equipmentId}/${verificationId}/${Date.now()}-${file.name}`;
      
      const { data, error } = await this.supabase.storage
        .from('equipment-files')
        .upload(fileName, file);

      if (error) {
        throw new Error(`Ошибка загрузки файла: ${error.message}`);
      }

      const { data: urlData } = this.supabase.storage
        .from('equipment-files')
        .getPublicUrl(fileName);

      // Обновляем запись аттестации с URL файла
      await this.supabase
        .from('equipment_verifications')
        .update({
          verification_file_url: urlData.publicUrl,
          verification_file_name: file.name
        })
        .eq('id', verificationId);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Ошибка при загрузке файла аттестации:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const equipmentService = new EquipmentService();