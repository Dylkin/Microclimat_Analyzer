import { supabase } from './supabaseClient';
import { QualificationObject, CreateQualificationObjectData } from '../types/QualificationObject';
import { sanitizeFileName } from './fileNameUtils';
import { getMimeType } from './mimeTypeUtils';

class QualificationObjectService {
  private supabase;

  constructor() {
    this.supabase = supabase;
  }


  isAvailable(): boolean {
    return !!this.supabase;
  }

  async getAllQualificationObjects(): Promise<QualificationObject[]> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    // Проверяем подключение к Supabase
    if (!this.supabase) {
      throw new Error('Supabase клиент не инициализирован');
    }

    const { data, error } = await this.supabase!
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

    // Проверяем подключение к Supabase
    if (!this.supabase) {
      throw new Error('Supabase клиент не инициализирован');
    }

    const { data, error } = await this.supabase!
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

  async getQualificationObjectById(id: string): Promise<QualificationObject> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    console.log('Загрузка объекта квалификации по ID:', id);

    const { data, error } = await this.supabase!
      .from('qualification_objects')
      .select(`
        *,
        contractor:contractors(name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Ошибка загрузки объекта квалификации:', error);
      throw new Error(`Ошибка получения объекта квалификации: ${error.message}`);
    }

    if (!data) {
      console.error('Объект квалификации не найден для ID:', id);
      throw new Error('Объект квалификации не найден');
    }

    console.log('Объект квалификации загружен:', data);
    return this.mapFromDatabase(data);
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

  private mapFromDatabase(data: any): QualificationObject {
    // Безопасная обработка measurement_zones для JSONB поля
    let measurementZones = [];
    try {
      const measurementZonesData = data.measurement_zones;
      console.log('Обработка measurement_zones из БД:', {
        objectId: data.id,
        rawData: measurementZonesData,
        dataType: typeof measurementZonesData,
        isArray: Array.isArray(measurementZonesData)
      });
      
      if (measurementZonesData) {
        // JSONB поля уже возвращаются как объекты/массивы
        if (Array.isArray(measurementZonesData)) {
          measurementZones = measurementZonesData;
          console.log('measurement_zones загружен как массив:', measurementZones);
        } else if (typeof measurementZonesData === 'string' && measurementZonesData.trim() !== '') {
          // Если все же пришла строка, парсим её
          measurementZones = JSON.parse(measurementZonesData);
          if (!Array.isArray(measurementZones)) {
            console.warn('measurement_zones не является массивом после парсинга, используем пустой массив');
            measurementZones = [];
          }
        } else {
          console.warn('measurement_zones имеет неожиданный тип:', typeof measurementZonesData);
          measurementZones = [];
        }
      } else {
        // Если поле пустое или null - используем пустой массив
        console.log('measurement_zones пустое или null');
        measurementZones = [];
      }
    } catch (error) {
      // Логируем ошибку и используем пустой массив как fallback
      console.error('Ошибка обработки measurement_zones для объекта:', data.id, error);
      measurementZones = [];
    }

    return {
      id: data.id,
      contractorId: data.contractor_id,
      type: data.type,
      name: data.name || '',
      manufacturer: data.manufacturer || '',
      climateSystem: data.climate_system || '',
      planFileUrl: data.plan_file_url || '',
      planFileName: data.plan_file_name || '',
      address: data.address || '',
      latitude: data.latitude ? parseFloat(data.latitude) : undefined,
      longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      geocodedAt: data.geocoded_at ? new Date(data.geocoded_at) : undefined,
      area: data.area ? parseFloat(data.area) : undefined,
      vin: data.vin || '',
      registrationNumber: data.registration_number || '',
      bodyVolume: data.body_volume ? parseFloat(data.body_volume) : undefined,
      inventoryNumber: data.inventory_number || '',
      chamberVolume: data.chamber_volume ? parseFloat(data.chamber_volume) : undefined,
      serialNumber: data.serial_number || '',
      testDataFileUrl: data.test_data_file_url || '',
      testDataFileName: data.test_data_file_name || '',
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      measurementZones: measurementZones
    };
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
        const filePaths = files.map(file => `${folderPath}/${file.name}`);
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
        console.log('QualificationObjectService: Найдены папки в Storage:', data.map(f => f.name));
        
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

            console.log('QualificationObjectService: Файлы в папке', folder.name, ':', zoneFiles?.map(f => f.name) || [], 'Ошибка:', zoneError);

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