import { apiClient } from './apiClient';
import { QualificationObject, CreateQualificationObjectData } from '../types/QualificationObject';
import { sanitizeFileName } from './fileNameUtils';
import { getMimeType } from './mimeTypeUtils';
import { supabase } from './supabaseClient';

class QualificationObjectService {
  private supabase = supabase;
  isAvailable(): boolean {
    return !!apiClient;
  }

  async getAllQualificationObjects(): Promise<QualificationObject[]> {
    try {
      const data = await apiClient.get<any[]>('/qualification-objects');
      return data.map(this.mapFromApi);
    } catch (error: any) {
      console.error('Ошибка загрузки объектов квалификации:', error);
      throw new Error(`Ошибка загрузки объектов квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async getQualificationObjectsByContractor(contractorId: string): Promise<QualificationObject[]> {
    try {
      const data = await apiClient.get<any[]>(`/qualification-objects?contractor_id=${contractorId}`);
      return data.map(this.mapFromApi);
    } catch (error: any) {
      console.error('Ошибка загрузки объектов квалификации контрагента:', error);
      throw new Error(`Ошибка загрузки объектов квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async getQualificationObjectById(id: string): Promise<QualificationObject> {
    try {
      console.log('Загрузка объекта квалификации по ID:', id);
      const data = await apiClient.get<any>(`/qualification-objects/${id}`);
      return this.mapFromApi(data);
    } catch (error: any) {
      console.error('Ошибка загрузки объекта квалификации:', error);
      throw new Error(`Ошибка загрузки объекта квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }


  async createQualificationObject(qualificationObject: CreateQualificationObjectData): Promise<QualificationObject> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const dbData = this.mapToDatabase(qualificationObject);
    
    const { data, error } = await this.supabase!
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

  async updateQualificationObject(id: string, updates: Partial<QualificationObject> | CreateQualificationObjectData): Promise<QualificationObject> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const dbUpdates = this.mapToDatabase(updates);
    
    const { data, error } = await this.supabase!
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

  // Обновление зон измерения для объекта квалификации
  async updateMeasurementZones(objectId: string, measurementZones: any[]): Promise<QualificationObject> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    console.log('Сохранение зон измерения:', {
      objectId,
      zonesCount: measurementZones.length,
      zones: measurementZones
    });

    // Для JSONB поля передаем объект напрямую, а не строку
    const { data, error } = await this.supabase!
      .from('qualification_objects')
      .update({ 
        measurement_zones: measurementZones, // Передаем объект напрямую для JSONB
        updated_at: new Date().toISOString()
      })
      .eq('id', objectId)
      .select(`
        *,
        contractor:contractors(name)
      `)
      .single();

    if (error) {
      console.error('Ошибка обновления зон измерения:', error);
      throw new Error(`Ошибка обновления зон измерения: ${error.message}`);
    }

    console.log('Зоны измерения успешно сохранены:', data);
    return this.mapFromDatabase(data);
  }

  async deleteQualificationObject(id: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const { error } = await this.supabase!
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

    // Очищаем имя файла от недопустимых символов
    const sanitizedFileName = sanitizeFileName(file.name);
    const fileName = `plans/${objectId}/${Date.now()}-${sanitizedFileName}`;
    const mimeType = getMimeType(file.name);
    
    const { data, error } = await this.supabase!.storage
      .from('qualification-objects')
      .upload(fileName, file, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Ошибка загрузки файла плана: ${error.message}`);
    }

    const { data: urlData } = this.supabase!.storage
      .from('qualification-objects')
      .getPublicUrl(fileName);

    // Обновляем объект с URL файла
    await this.supabase!
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

    // Очищаем имя файла от недопустимых символов
    const sanitizedFileName = sanitizeFileName(file.name);
    const fileName = `test-data/${objectId}/${Date.now()}-${sanitizedFileName}`;
    const mimeType = getMimeType(file.name);
    
    const { data, error } = await this.supabase!.storage
      .from('qualification-objects')
      .upload(fileName, file, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Ошибка загрузки файла данных испытаний: ${error.message}`);
    }

    const { data: urlData } = this.supabase!.storage
      .from('qualification-objects')
      .getPublicUrl(fileName);

    // Обновляем объект с URL файла
    await this.supabase!
      .from('qualification_objects')
      .update({
        test_data_file_url: urlData.publicUrl,
        test_data_file_name: file.name
      })
      .eq('id', objectId);

    return urlData.publicUrl;
  }

  // Маппинг данных из API в QualificationObject
  private mapFromApi(data: any): QualificationObject {
    // Обработка measurement_zones из JSONB
    let measurementZones = [];
    try {
      const measurementZonesData = data.measurementZones || data.measurement_zones;
      if (measurementZonesData) {
        if (Array.isArray(measurementZonesData)) {
          measurementZones = measurementZonesData;
        } else if (typeof measurementZonesData === 'string') {
          measurementZones = JSON.parse(measurementZonesData);
        }
      }
    } catch (error) {
      console.error('Ошибка обработки measurement_zones:', error);
      measurementZones = [];
    }

    return {
      id: data.id,
      contractorId: data.contractorId || data.contractor_id || '',
      type: (data.objectType || data.type || 'помещение') as any,
      name: data.name || '',
      manufacturer: data.manufacturer || '',
      climateSystem: data.climateSystem || data.climate_system || '',
      planFileUrl: data.planFileUrl || data.plan_file_url || '',
      planFileName: data.planFileName || data.plan_file_name || '',
      address: data.address || '',
      latitude: data.latitude ? parseFloat(data.latitude) : undefined,
      longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      geocodedAt: data.geocodedAt ? new Date(data.geocodedAt) : (data.geocoded_at ? new Date(data.geocoded_at) : undefined),
      area: data.area ? parseFloat(data.area) : undefined,
      vin: data.vin || '',
      registrationNumber: data.registrationNumber || data.registration_number || '',
      bodyVolume: data.bodyVolume ? parseFloat(data.bodyVolume) : (data.body_volume ? parseFloat(data.body_volume) : undefined),
      inventoryNumber: data.inventoryNumber || data.inventory_number || '',
      chamberVolume: data.chamberVolume ? parseFloat(data.chamberVolume) : (data.chamber_volume ? parseFloat(data.chamber_volume) : undefined),
      serialNumber: data.serialNumber || data.serial_number || '',
      testDataFileUrl: data.testDataFileUrl || data.test_data_file_url || '',
      testDataFileName: data.testDataFileName || data.test_data_file_name || '',
      createdAt: data.createdAt ? new Date(data.createdAt) : (data.created_at ? new Date(data.created_at) : new Date()),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : (data.updated_at ? new Date(data.updated_at) : new Date()),
      measurementZones: measurementZones
    };
  }

  // Старый метод для обратной совместимости
  private mapFromDatabase(data: any): QualificationObject {
    return this.mapFromApi(data);
  }

  private mapToDatabase(data: Partial<QualificationObject> | CreateQualificationObjectData): any {
    const dbData: any = {};
    
    if (data.contractorId !== undefined) dbData.contractor_id = data.contractorId;
    if (data.type !== undefined) dbData.type = data.type;
    if (data.name !== undefined) dbData.name = data.name;
    if (data.manufacturer !== undefined) dbData.manufacturer = data.manufacturer;
    if (data.climateSystem !== undefined) dbData.climate_system = data.climateSystem;
    
    // Поля, которые есть только в QualificationObject
    if ('planFileUrl' in data && data.planFileUrl !== undefined) dbData.plan_file_url = data.planFileUrl;
    if ('planFileName' in data && data.planFileName !== undefined) dbData.plan_file_name = data.planFileName;
    if ('geocodedAt' in data && data.geocodedAt !== undefined) dbData.geocoded_at = data.geocodedAt?.toISOString();
    if ('testDataFileUrl' in data && data.testDataFileUrl !== undefined) dbData.test_data_file_url = data.testDataFileUrl;
    if ('testDataFileName' in data && data.testDataFileName !== undefined) dbData.test_data_file_name = data.testDataFileName;
    
    if (data.address !== undefined) dbData.address = data.address;
    if (data.latitude !== undefined) dbData.latitude = data.latitude;
    if (data.longitude !== undefined) dbData.longitude = data.longitude;
    if (data.area !== undefined) dbData.area = data.area;
    if (data.vin !== undefined) dbData.vin = data.vin;
    if (data.registrationNumber !== undefined) dbData.registration_number = data.registrationNumber;
    if (data.bodyVolume !== undefined) dbData.body_volume = data.bodyVolume;
    if (data.inventoryNumber !== undefined) dbData.inventory_number = data.inventoryNumber;
    if (data.chamberVolume !== undefined) dbData.chamber_volume = data.chamberVolume;
    if (data.serialNumber !== undefined) dbData.serial_number = data.serialNumber;
    
    // Обработка measurementZones с генерацией ID
    if (data.measurementZones !== undefined) {
      const zonesWithIds = data.measurementZones.map((zone: any) => ({
        ...zone,
        id: zone.id || `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        measurementLevels: zone.measurementLevels.map((level: any) => ({
          ...level,
          id: level.id || `level-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }))
      }));
      dbData.measurement_zones = JSON.stringify(zonesWithIds);
    }

    return dbData;
  }

  async uploadLoggerRemovalFile(objectId: string, zoneNumber: number, level: number, file: File): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    // Сохраняем оригинальное имя файла для .vi2 файлов
    const originalFileName = file.name;
    const fileName = `logger-removal/${objectId}/zone-${zoneNumber}-level-${level}/${originalFileName}`;
    const mimeType = getMimeType(file.name);
    
    const { data, error } = await this.supabase!.storage
      .from('qualification-objects')
      .upload(fileName, file, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true // Разрешаем перезапись файла с тем же именем
      });

    if (error) {
      throw new Error(`Ошибка загрузки файла снятия логгеров: ${error.message}`);
    }

    const { data: urlData } = this.supabase!.storage
      .from('qualification-objects')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  // Удаление файла снятия логгеров из Storage
  async deleteLoggerRemovalFile(objectId: string, zoneNumber: number, level: number): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Получаем список файлов в папке для данной зоны и уровня
      const folderPath = `logger-removal/${objectId}/zone-${zoneNumber}-level-${level}`;
      const { data: files, error: listError } = await this.supabase!.storage
        .from('qualification-objects')
        .list(folderPath);

      if (listError) {
        console.error('Ошибка получения списка файлов для удаления:', listError);
        return;
      }

      if (files && files.length > 0) {
        // Удаляем все файлы в папке
        const filePaths = files.map((file: any) => `${folderPath}/${file.name}`);
        const { error: deleteError } = await this.supabase!.storage
          .from('qualification-objects')
          .remove(filePaths);

        if (deleteError) {
          console.error('Ошибка удаления файлов из Storage:', deleteError);
          throw new Error(`Ошибка удаления файлов: ${deleteError.message}`);
        }

        console.log(`Удалены файлы из Storage: ${filePaths.join(', ')}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении файла снятия логгеров:', error);
      throw error;
    }
  }

  // Получение списка файлов снятия логгеров из Storage
  async getLoggerRemovalFiles(objectId: string): Promise<{ [key: string]: { name: string; url: string; size: number; lastModified: string } }> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase!.storage
        .from('qualification-objects')
        .list(`logger-removal/${objectId}`, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Ошибка получения списка файлов из Storage:', error);
        return {};
      }

      const filesMap: { [key: string]: { name: string; url: string; size: number; lastModified: string } } = {};

      if (data && data.length > 0) {
        console.log('QualificationObjectService: Найдены папки в Storage:', data.map((f: any) => f.name));
        
        for (const folder of data) {
          console.log('QualificationObjectService: Обрабатываем папку:', folder.name);
          
          if (folder.name.startsWith('zone-') && folder.name.includes('-level-')) {
            console.log('QualificationObjectService: Папка соответствует паттерну зоны:', folder.name);
            
            // Получаем файлы в папке зоны
            const { data: zoneFiles, error: zoneError } = await this.supabase!.storage
              .from('qualification-objects')
              .list(`logger-removal/${objectId}/${folder.name}`, {
                limit: 10,
                sortBy: { column: 'created_at', order: 'desc' }
              });

            console.log('QualificationObjectService: Файлы в папке', folder.name, ':', zoneFiles?.map((f: any) => f.name) || [], 'Ошибка:', zoneError);

            if (!zoneError && zoneFiles && zoneFiles.length > 0) {
              // Берем самый новый файл из папки
              const latestFile = zoneFiles[0];
              const fileKey = folder.name; // zone-1-level-0
              
              console.log('QualificationObjectService: Выбран файл для папки', folder.name, ':', latestFile.name);
              
              const { data: urlData } = this.supabase!.storage
                .from('qualification-objects')
                .getPublicUrl(`logger-removal/${objectId}/${folder.name}/${latestFile.name}`);

              filesMap[fileKey] = {
                name: latestFile.name,
                url: urlData.publicUrl,
                size: latestFile.metadata?.size || 0,
                lastModified: latestFile.updated_at || latestFile.created_at
              };
              
              console.log('QualificationObjectService: Добавлен файл в карту:', fileKey, latestFile.name);
            } else {
              console.log('QualificationObjectService: Нет файлов в папке', folder.name, 'или ошибка:', zoneError);
            }
          } else {
            console.log('QualificationObjectService: Папка не соответствует паттерну зоны:', folder.name);
          }
        }
      } else {
        console.log('QualificationObjectService: Нет папок в Storage для объекта:', objectId);
      }

      return filesMap;
    } catch (error) {
      console.error('Ошибка получения файлов снятия логгеров:', error);
      return {};
    }
  }
}

export const qualificationObjectService = new QualificationObjectService();