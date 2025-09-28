import { createClient } from '@supabase/supabase-js';
import { QualificationObject } from '../types/QualificationObject';

class QualificationObjectService {
  private supabase;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL и ключ должны быть настроены в переменных окружения');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  isAvailable(): boolean {
    return !!this.supabase;
  }

  async getAllQualificationObjects(): Promise<QualificationObject[]> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    // Проверяем переменные окружения
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Переменные окружения VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY не настроены');
    }

    const { data, error } = await this.supabase
      .from('qualification_objects')
      .select(`
        *,
        contractor:contractors(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      // Специальная обработка ошибок подключения
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        throw new Error('Ошибка сети при подключении к Supabase. Проверьте URL проекта.');
      }
      if (error.message?.includes('Invalid API key') || error.message?.includes('unauthorized')) {
        throw new Error('Неверный ключ API Supabase. Проверьте VITE_SUPABASE_ANON_KEY.');
      }
      
      throw new Error(`Ошибка загрузки объектов квалификации: ${error.message}`);
    }

    if (!data) {
      console.warn('Получен null/undefined ответ от Supabase для объектов квалификации');
      return [];
    }

    return data.map(this.mapFromDatabase);
  }

  async getQualificationObjectsByContractor(contractorId: string): Promise<QualificationObject[]> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    // Проверяем переменные окружения
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Переменные окружения VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY не настроены');
    }

    const { data, error } = await this.supabase
      .from('qualification_objects')
      .select(`
        *,
        contractor:contractors(name)
      `)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) {
      // Специальная обработка ошибок подключения
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        throw new Error('Ошибка сети при подключении к Supabase. Проверьте URL проекта.');
      }
      if (error.message?.includes('Invalid API key') || error.message?.includes('unauthorized')) {
        throw new Error('Неверный ключ API Supabase. Проверьте VITE_SUPABASE_ANON_KEY.');
      }
      
      throw new Error(`Ошибка загрузки объектов квалификации: ${error.message}`);
    }

    if (!data) {
      console.warn('Получен null/undefined ответ от Supabase для объектов квалификации контрагента');
      return [];
    }

    return data.map(this.mapFromDatabase);
  }

  async createQualificationObject(qualificationObject: Omit<QualificationObject, 'id' | 'createdAt' | 'updatedAt'>): Promise<QualificationObject> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const dbData = this.mapToDatabase(qualificationObject);
    
    const { data, error } = await this.supabase
      .from('qualification_objects')
      .insert(dbData)
      .select(`
        *,
        contractor:contractors(name)
      `)
      .single();

    if (error) {
      throw new Error(`Ошибка создания объекта квалификации: ${error.message}`);
    }

    return this.mapFromDatabase(data);
  }

  async updateQualificationObject(id: string, updates: Partial<QualificationObject>): Promise<QualificationObject> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const dbUpdates = this.mapToDatabase(updates);
    
    const { data, error } = await this.supabase
      .from('qualification_objects')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        contractor:contractors(name)
      `)
      .single();

    if (error) {
      throw new Error(`Ошибка обновления объекта квалификации: ${error.message}`);
    }

    return this.mapFromDatabase(data);
  }

  async deleteQualificationObject(id: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const { error } = await this.supabase
      .from('qualification_objects')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Ошибка удаления объекта квалификации: ${error.message}`);
    }
  }

  async uploadPlanFile(objectId: string, file: File): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const fileName = `plans/${objectId}/${Date.now()}-${file.name}`;
    
    const { data, error } = await this.supabase.storage
      .from('qualification-objects')
      .upload(fileName, file);

    if (error) {
      throw new Error(`Ошибка загрузки файла плана: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from('qualification-objects')
      .getPublicUrl(fileName);

    // Обновляем объект с URL файла
    await this.supabase
      .from('qualification_objects')
      .update({
        plan_file_url: urlData.publicUrl,
        plan_file_name: file.name
      })
      .eq('id', objectId);

    return urlData.publicUrl;
  }

  async uploadTestDataFile(objectId: string, file: File): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const fileName = `test-data/${objectId}/${Date.now()}-${file.name}`;
    
    const { data, error } = await this.supabase.storage
      .from('qualification-objects')
      .upload(fileName, file);

    if (error) {
      throw new Error(`Ошибка загрузки файла данных испытаний: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from('qualification-objects')
      .getPublicUrl(fileName);

    // Обновляем объект с URL файла
    await this.supabase
      .from('qualification_objects')
      .update({
        test_data_file_url: urlData.publicUrl,
        test_data_file_name: file.name
      })
      .eq('id', objectId);

    return urlData.publicUrl;
  }

  private mapFromDatabase(data: any): QualificationObject {
    // Безопасный парсинг measurement_zones с проверкой на пустые значения
    let measurementZones = [];
    try {
      const jsonString = data.measurement_zones;
      if (jsonString && typeof jsonString === 'string' && jsonString.trim() !== '') {
        measurementZones = JSON.parse(jsonString);
        // Дополнительная проверка, что результат парсинга - массив
        if (!Array.isArray(measurementZones)) {
          console.warn('measurement_zones не является массивом, используем пустой массив');
          measurementZones = [];
        }
      } else {
        // Если поле пустое, null или не строка - используем пустой массив
        measurementZones = [];
      }
    } catch (error) {
      // Логируем ошибку и используем пустой массив как fallback
      console.error('Ошибка парсинга measurement_zones для объекта:', data.id, error);
      measurementZones = [];
    }

    return {
      id: data.id,
      contractorId: data.contractor_id,
      contractorName: data.contractor?.name || '',
      type: data.type,
      name: data.name || '',
      manufacturer: data.manufacturer || '',
      climateSystem: data.climate_system || '',
      planFileUrl: data.plan_file_url || '',
      planFileName: data.plan_file_name || '',
      address: data.address || '',
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      geocodedAt: data.geocoded_at ? new Date(data.geocoded_at) : null,
      area: data.area ? parseFloat(data.area) : null,
      vin: data.vin || '',
      registrationNumber: data.registration_number || '',
      bodyVolume: data.body_volume ? parseFloat(data.body_volume) : null,
      inventoryNumber: data.inventory_number || '',
      chamberVolume: data.chamber_volume ? parseFloat(data.chamber_volume) : null,
      serialNumber: data.serial_number || '',
      testDataFileUrl: data.test_data_file_url || '',
      testDataFileName: data.test_data_file_name || '',
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      measurementZones: measurementZones
    };
  }

  private mapToDatabase(data: Partial<QualificationObject>): any {
    const dbData: any = {};
    
    if (data.contractorId !== undefined) dbData.contractor_id = data.contractorId;
    if (data.type !== undefined) dbData.type = data.type;
    if (data.name !== undefined) dbData.name = data.name;
    if (data.manufacturer !== undefined) dbData.manufacturer = data.manufacturer;
    if (data.climateSystem !== undefined) dbData.climate_system = data.climateSystem;
    if (data.planFileUrl !== undefined) dbData.plan_file_url = data.planFileUrl;
    if (data.planFileName !== undefined) dbData.plan_file_name = data.planFileName;
    if (data.address !== undefined) dbData.address = data.address;
    if (data.latitude !== undefined) dbData.latitude = data.latitude;
    if (data.longitude !== undefined) dbData.longitude = data.longitude;
    if (data.geocodedAt !== undefined) dbData.geocoded_at = data.geocodedAt?.toISOString();
    if (data.area !== undefined) dbData.area = data.area;
    if (data.vin !== undefined) dbData.vin = data.vin;
    if (data.registrationNumber !== undefined) dbData.registration_number = data.registrationNumber;
    if (data.bodyVolume !== undefined) dbData.body_volume = data.bodyVolume;
    if (data.inventoryNumber !== undefined) dbData.inventory_number = data.inventoryNumber;
    if (data.chamberVolume !== undefined) dbData.chamber_volume = data.chamberVolume;
    if (data.serialNumber !== undefined) dbData.serial_number = data.serialNumber;
    if (data.testDataFileUrl !== undefined) dbData.test_data_file_url = data.testDataFileUrl;
    if (data.testDataFileName !== undefined) dbData.test_data_file_name = data.testDataFileName;
    if (data.measurementZones !== undefined) dbData.measurement_zones = JSON.stringify(data.measurementZones);

    return dbData;
  }
}

export const qualificationObjectService = new QualificationObjectService();