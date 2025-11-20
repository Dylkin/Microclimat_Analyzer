import { apiClient } from './apiClient';
import { Equipment, EquipmentType, CreateEquipmentData, UpdateEquipmentData, EquipmentVerification } from '../types/Equipment';

class EquipmentService {
  // Проверка доступности API
  isAvailable(): boolean {
    return !!apiClient;
  }

  // Получение всего оборудования с пагинацией
  async getAllEquipment(page: number = 1, limit: number = 10, searchTerm?: string, sortOrder: 'asc' | 'desc' = 'asc'): Promise<{
    equipment: Equipment[];
    total: number;
    totalPages: number;
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortOrder: sortOrder
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const data = await apiClient.get<{
        equipment: any[];
        total: number;
        totalPages: number;
      }>(`/equipment?${params.toString()}`);
      
      return {
        equipment: data.equipment.map(this.mapFromApi),
        total: data.total,
        totalPages: data.totalPages
      };
    } catch (error: any) {
      console.error('Ошибка получения оборудования:', error);
      throw new Error(`Ошибка получения оборудования: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получение оборудования по ID
  async getEquipmentById(id: string): Promise<Equipment> {
    try {
      const data = await apiClient.get<any>(`/equipment/${id}`);
      return this.mapFromApi(data);
    } catch (error: any) {
      console.error('Ошибка получения оборудования:', error);
      throw new Error(`Ошибка получения оборудования: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Добавление нового оборудования
  async addEquipment(equipmentData: CreateEquipmentData): Promise<Equipment> {
    try {
      console.log('Добавляем оборудование:', equipmentData);

      const equipment = await apiClient.post<any>('/equipment', {
        type: equipmentData.type,
        name: equipmentData.name,
        serialNumber: equipmentData.serialNumber
      });

      // Добавляем верификации если они есть
      if (equipmentData.verifications && equipmentData.verifications.length > 0) {
        for (const verification of equipmentData.verifications) {
          await this.addVerification(equipment.id, verification);
        }
        
        // Перезагружаем оборудование с верификациями
        return await this.getEquipmentById(equipment.id);
      }

      return this.mapFromApi(equipment);
    } catch (error: any) {
      console.error('Ошибка при добавлении оборудования:', error);
      throw error;
    }
  }

  // Обновление оборудования
  async updateEquipment(id: string, updates: UpdateEquipmentData): Promise<Equipment> {
    try {
      const equipment = await apiClient.put<any>(`/equipment/${id}`, {
        type: updates.type,
        name: updates.name,
        serialNumber: updates.serialNumber
      });

      return this.mapFromApi(equipment);
    } catch (error: any) {
      console.error('Ошибка при обновлении оборудования:', error);
      throw error;
    }
  }

  // Удаление оборудования
  async deleteEquipment(id: string): Promise<void> {
    try {
      await apiClient.delete(`/equipment/${id}`);
    } catch (error: any) {
      console.error('Ошибка при удалении оборудования:', error);
      throw error;
    }
  }

  // Получение статистики оборудования
  async getEquipmentStats(): Promise<{
    total: number;
    byType: Record<EquipmentType, number>;
  }> {
    try {
      const stats = await apiClient.get<{
        total: number;
        byType: Record<EquipmentType, number>;
      }>('/equipment/stats');
      
      return stats;
    } catch (error: any) {
      console.error('Ошибка получения статистики:', error);
      throw new Error(`Ошибка получения статистики: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Добавление аттестации
  async addVerification(equipmentId: string, verification: Omit<EquipmentVerification, 'id' | 'equipmentId' | 'createdAt'>): Promise<EquipmentVerification> {
    try {
      const result = await apiClient.post<EquipmentVerification>(`/equipment/${equipmentId}/verifications`, {
        verificationStartDate: verification.verificationStartDate,
        verificationEndDate: verification.verificationEndDate,
        verificationFileUrl: verification.verificationFileUrl,
        verificationFileName: verification.verificationFileName
      });
      
      return {
        id: result.id,
        equipmentId: result.equipmentId,
        verificationStartDate: new Date(result.verificationStartDate),
        verificationEndDate: new Date(result.verificationEndDate),
        verificationFileUrl: result.verificationFileUrl,
        verificationFileName: result.verificationFileName,
        createdAt: new Date(result.createdAt)
      };
    } catch (error: any) {
      console.error('Ошибка при добавлении верификации:', error);
      throw new Error(`Ошибка добавления верификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Удаление аттестации
  async deleteVerification(equipmentId: string, verificationId: string): Promise<void> {
    try {
      await apiClient.delete(`/equipment/${equipmentId}/verifications/${verificationId}`);
    } catch (error: any) {
      console.error('Ошибка при удалении верификации:', error);
      throw new Error(`Ошибка удаления верификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Маппинг данных из API в Equipment
  private mapFromApi(data: any): Equipment {
    return {
      id: data.id,
      type: data.type as EquipmentType,
      name: data.name,
      serialNumber: data.serialNumber || data.serial_number,
      createdAt: data.createdAt ? new Date(data.createdAt) : (data.created_at ? new Date(data.created_at) : new Date()),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : (data.updated_at ? new Date(data.updated_at) : new Date()),
      verifications: (data.verifications || []).map((v: any) => ({
        id: v.id,
        equipmentId: v.equipmentId || v.equipment_id,
        verificationStartDate: v.verificationStartDate ? new Date(v.verificationStartDate) : new Date(v.verification_start_date),
        verificationEndDate: v.verificationEndDate ? new Date(v.verificationEndDate) : new Date(v.verification_end_date),
        verificationFileUrl: v.verificationFileUrl || v.verification_file_url || undefined,
        verificationFileName: v.verificationFileName || v.verification_file_name || undefined,
        createdAt: v.createdAt ? new Date(v.createdAt) : new Date(v.created_at)
      }))
    };
  }
}

// Экспорт синглтона сервиса
export const equipmentService = new EquipmentService();
