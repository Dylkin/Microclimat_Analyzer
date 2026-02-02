import { apiClient } from './apiClient';
import { QualificationObject, CreateQualificationObjectData } from '../types/QualificationObject';
import { sanitizeFileName } from './fileNameUtils';
import { getMimeType } from './mimeTypeUtils';

type StorageFileObject = {
  name: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
  last_accessed_at?: string;
  metadata?: {
    size?: number;
  };
};

class QualificationObjectService {
  isAvailable(): boolean {
    return true; // API всегда доступен
  }

  private buildProjectPath(prefix: string, objectId: string, projectId?: string): string {
    return projectId ? `${prefix}/${projectId}/${objectId}` : `${prefix}/${objectId}`;
  }

  async getAllQualificationObjects(projectId?: string): Promise<QualificationObject[]> {
    try {
      const params = new URLSearchParams();
      if (projectId) {
        params.set('project_id', projectId);
      }
      const url = params.toString() ? `/qualification-objects?${params.toString()}` : '/qualification-objects';
      const data = await apiClient.get<any[]>(url);
      return data.map(item => this.mapFromApi(item));
    } catch (error: any) {
      console.error('Ошибка загрузки объектов квалификации:', error);
      throw new Error(`Ошибка загрузки объектов квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async getQualificationObjectsByContractor(contractorId: string, projectId?: string): Promise<QualificationObject[]> {
    try {
      const params = new URLSearchParams({ contractor_id: contractorId });
      if (projectId) {
        params.set('project_id', projectId);
      }
      const data = await apiClient.get<any[]>(`/qualification-objects?${params.toString()}`);
      return data.map(item => this.mapFromApi(item));
    } catch (error: any) {
      console.error('Ошибка загрузки объектов квалификации контрагента:', error);
      throw new Error(`Ошибка загрузки объектов квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async getQualificationObjectById(id: string, projectId?: string): Promise<QualificationObject> {
    try {
      console.log('Загрузка объекта квалификации по ID:', id);
      const params = new URLSearchParams();
      if (projectId) {
        params.set('project_id', projectId);
      }
      const url = params.toString() ? `/qualification-objects/${id}?${params.toString()}` : `/qualification-objects/${id}`;
      const data = await apiClient.get<any>(url);
      return this.mapFromApi(data);
    } catch (error: any) {
      console.error('Ошибка загрузки объекта квалификации:', error);
      throw new Error(`Ошибка загрузки объекта квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }


  async createQualificationObject(qualificationObject: CreateQualificationObjectData, projectId?: string): Promise<QualificationObject> {
    try {
      const dbData = this.mapToDatabase({ ...qualificationObject, projectId });
      const data = await apiClient.post<any>('/qualification-objects', dbData);
      return this.mapFromApi(data);
    } catch (error: any) {
      console.error('Ошибка создания объекта квалификации:', error);
      throw new Error(`Ошибка создания объекта квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async updateQualificationObject(id: string, updates: Partial<QualificationObject> | CreateQualificationObjectData, projectId?: string): Promise<QualificationObject> {
    try {
      const dbUpdates = this.mapToDatabase({ ...updates, projectId });
      const data = await apiClient.put<any>(`/qualification-objects/${id}`, dbUpdates);
      return this.mapFromApi(data);
    } catch (error: any) {
      console.error('Ошибка обновления объекта квалификации:', error);
      throw new Error(`Ошибка обновления объекта квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Обновление зон измерения для объекта квалификации
  async updateMeasurementZones(objectId: string, measurementZones: any[], projectId?: string): Promise<QualificationObject> {
    try {
      console.log('Сохранение зон измерения:', {
        objectId,
        zonesCount: measurementZones.length,
        zones: measurementZones
      });

      const data = await apiClient.patch<any>(`/qualification-objects/${objectId}`, {
        measurementZones: measurementZones,
        projectId
      });

      console.log('Зоны измерения успешно сохранены:', data);
      return this.mapFromApi(data);
    } catch (error: any) {
      console.error('Ошибка обновления зон измерения:', error);
      throw new Error(`Ошибка обновления зон измерения: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async deleteQualificationObject(id: string): Promise<void> {
    try {
      await apiClient.delete(`/qualification-objects/${id}`);
    } catch (error: any) {
      console.error('Ошибка удаления объекта квалификации:', error);
      throw new Error(`Ошибка удаления объекта квалификации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async uploadPlanFile(objectId: string, file: File, projectId?: string): Promise<string> {
    try {
      // Очищаем имя файла от недопустимых символов
      const sanitizedFileName = sanitizeFileName(file.name);
      const basePath = this.buildProjectPath('plans', objectId, projectId);
      const fileName = `${basePath}/${Date.now()}-${sanitizedFileName}`;

      // Загружаем файл через API
      const uploadResult = await apiClient.uploadFile('/storage/upload', file, {
        bucket: 'qualification-objects',
        path: fileName
      });

      const publicUrl = uploadResult.data?.publicUrl || `/uploads/qualification-objects/${fileName}`;

      // Обновляем объект с URL файла
      await apiClient.patch(`/qualification-objects/${objectId}`, {
        planFileUrl: publicUrl,
        planFileName: file.name,
        projectId
      });

      return publicUrl;
    } catch (error: any) {
      console.error('Ошибка загрузки файла плана:', error);
      throw new Error(`Ошибка загрузки файла плана: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async uploadTestDataFile(objectId: string, file: File, projectId?: string): Promise<string> {
    try {
      // Очищаем имя файла от недопустимых символов
      const sanitizedFileName = sanitizeFileName(file.name);
      const basePath = this.buildProjectPath('test-data', objectId, projectId);
      const fileName = `${basePath}/${Date.now()}-${sanitizedFileName}`;

      // Загружаем файл через API
      const uploadResult = await apiClient.uploadFile('/storage/upload', file, {
        bucket: 'qualification-objects',
        path: fileName
      });

      const publicUrl = uploadResult.data?.publicUrl || `/uploads/qualification-objects/${fileName}`;

      // Обновляем объект с URL файла
      await apiClient.patch(`/qualification-objects/${objectId}`, {
        testDataFileUrl: publicUrl,
        testDataFileName: file.name,
        projectId
      });

      return publicUrl;
    } catch (error: any) {
      console.error('Ошибка загрузки файла данных испытаний:', error);
      throw new Error(`Ошибка загрузки файла данных испытаний: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Маппинг типов объектов из английского в русский (из базы данных)
  private mapObjectTypeFromDatabase(type: string): string {
    const typeMap: Record<string, string> = {
      'room': 'помещение',
      'vehicle': 'автомобиль',
      'thermo_container': 'термоконтейнер',
      'cold_chamber': 'холодильная_камера',
      'refrigerator': 'холодильник',
      'freezer': 'морозильник'
    };
    return typeMap[type] || type;
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

    // Обработка storage_zones из JSONB
    let storageZones = [];
    try {
      const storageZonesData = data.storageZones || data.storage_zones;
      if (storageZonesData) {
        if (Array.isArray(storageZonesData)) {
          storageZones = storageZonesData;
        } else if (typeof storageZonesData === 'string') {
          storageZones = JSON.parse(storageZonesData);
        }
      }
    } catch (error) {
      console.error('Ошибка обработки storage_zones:', error);
      storageZones = [];
    }

    // Маппим тип объекта из английского в русский
    const objectType = data.objectType || data.type || 'room';
    const mappedType = this.mapObjectTypeFromDatabase(objectType);

    return {
      id: data.id,
      projectId: data.projectId || data.project_id || undefined,
      contractorId: data.contractorId || data.contractor_id || '',
      type: mappedType as any,
      name: data.name || '',
      storageZones: storageZones,
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

    // Маппинг типов объектов из русского в английский (для базы данных)
    private mapObjectTypeToDatabase(type: string): string {
      const typeMap: Record<string, string> = {
        'помещение': 'room',
        'автомобиль': 'vehicle',
        'термоконтейнер': 'thermo_container',
        'холодильная_камера': 'cold_chamber',
        'холодильник': 'refrigerator',
        'морозильник': 'freezer'
      };
      return typeMap[type] || type;
    }

    private mapToDatabase(data: Partial<QualificationObject> | CreateQualificationObjectData): any {
      const dbData: any = {};
      
      // Базовые поля
      if (data.contractorId !== undefined) dbData.contractorId = data.contractorId;
      if (data.type !== undefined) {
        // Маппим русский тип в английский для базы данных
        dbData.objectType = this.mapObjectTypeToDatabase(data.type);
      }
      if ('objectType' in data && data.objectType !== undefined) {
        // Если уже передан objectType (английский), используем его
        dbData.objectType = data.objectType;
      }
      if (data.name !== undefined) dbData.name = data.name;
      if ((data as any).storageZones !== undefined) dbData.storageZones = (data as any).storageZones;
      if (data.manufacturer !== undefined) dbData.manufacturer = data.manufacturer;
      if (data.climateSystem !== undefined) dbData.climateSystem = data.climateSystem;
      
      // Поля проекта (если есть projectId)
      if ('projectId' in data && data.projectId !== undefined) {
        dbData.projectId = data.projectId;
      } else if ('project' in data && data.project && typeof data.project === 'object' && 'id' in data.project && data.project.id) {
        dbData.projectId = data.project.id;
      }
      
      // Поля контрагента (если есть contractorId)
      if (data.contractorId !== undefined) {
        dbData.contractorId = data.contractorId;
      }
      
      // Поля, которые есть только в QualificationObject
      if ('planFileUrl' in data && data.planFileUrl !== undefined) dbData.planFileUrl = data.planFileUrl;
      if ('planFileName' in data && data.planFileName !== undefined) dbData.planFileName = data.planFileName;
      if ('geocodedAt' in data && data.geocodedAt !== undefined) dbData.geocodedAt = data.geocodedAt?.toISOString();
      if ('testDataFileUrl' in data && data.testDataFileUrl !== undefined) dbData.testDataFileUrl = data.testDataFileUrl;
      if ('testDataFileName' in data && data.testDataFileName !== undefined) dbData.testDataFileName = data.testDataFileName;
      
      // Дополнительные поля
      if (data.address !== undefined) dbData.address = data.address;
      if (data.latitude !== undefined) dbData.latitude = data.latitude;
      if (data.longitude !== undefined) dbData.longitude = data.longitude;
      if (data.area !== undefined) dbData.area = data.area;
      if (data.vin !== undefined) dbData.vin = data.vin;
      if (data.registrationNumber !== undefined) dbData.registrationNumber = data.registrationNumber;
      if (data.bodyVolume !== undefined) dbData.bodyVolume = data.bodyVolume;
      if (data.inventoryNumber !== undefined) dbData.inventoryNumber = data.inventoryNumber;
      if (data.chamberVolume !== undefined) dbData.chamberVolume = data.chamberVolume;
      if (data.serialNumber !== undefined) dbData.serialNumber = data.serialNumber;
      
      // JSONB поля - передаем как объекты, API сам сериализует
      if (data.measurementZones !== undefined) {
        const zonesWithIds = data.measurementZones.map((zone: any) => ({
          ...zone,
          id: zone.id || `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          measurementLevels: (zone.measurementLevels || []).map((level: any) => ({
            ...level,
            id: level.id || `level-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }))
        }));
        dbData.measurementZones = zonesWithIds; // Передаем объект, не строку
      }
      
      if ('temperatureLimits' in data && data.temperatureLimits !== undefined) {
        dbData.temperatureLimits = data.temperatureLimits;
      }
      
      if ('humidityLimits' in data && data.humidityLimits !== undefined) {
        dbData.humidityLimits = data.humidityLimits;
      }
      
      if ('workSchedule' in data && data.workSchedule !== undefined) {
        dbData.workSchedule = data.workSchedule;
      }

      return dbData;
    }

  async uploadLoggerRemovalFile(objectId: string, zoneNumber: number, level: number, file: File, projectId?: string): Promise<string> {
    try {
      // Сохраняем оригинальное имя файла для .vi2 файлов
      const originalFileName = file.name;
      const basePath = this.buildProjectPath('logger-removal', objectId, projectId);
      const fileName = `${basePath}/zone-${zoneNumber}-level-${level}/${originalFileName}`;

      // Загружаем файл через API
      const uploadResult = await apiClient.uploadFile('/storage/upload', file, {
        bucket: 'qualification-objects',
        path: fileName
      });

      const publicUrl = uploadResult.data?.publicUrl || `/uploads/qualification-objects/${fileName}`;
      return publicUrl;
    } catch (error: any) {
      console.error('Ошибка загрузки файла снятия логгеров:', error);
      throw new Error(`Ошибка загрузки файла снятия логгеров: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Удаление файла снятия логгеров из Storage
  async deleteLoggerRemovalFile(objectId: string, zoneNumber: number, level: number, projectId?: string): Promise<void> {
    try {
      // Преобразуем дробные значения уровня в строку с точкой для совместимости
      const levelStr = level.toString();
      // Получаем список файлов в папке для данной зоны и уровня
      const basePath = this.buildProjectPath('logger-removal', objectId, projectId);
      const folderPath = `${basePath}/zone-${zoneNumber}-level-${levelStr}`;
      
      console.log('Удаление файлов из Storage:', { objectId, zoneNumber, level, levelStr, folderPath });
      
      const listResult = await apiClient.post<{ data: StorageFileObject[] }>('/storage/list', {
        bucket: 'qualification-objects',
        prefix: folderPath
      });

      const fileEntries: StorageFileObject[] = listResult.data || [];
      console.log('Найдено файлов для удаления:', fileEntries.length);

      if (fileEntries.length > 0) {
        const filePaths = fileEntries
          .filter(file => file.id) // Только файлы, не папки
          .map((file: StorageFileObject) => {
            // Если file.name уже содержит полный путь, используем его, иначе добавляем folderPath
            if (file.name.startsWith(folderPath)) {
              return file.name;
            }
            return `${folderPath}/${file.name}`;
          });

        if (filePaths.length > 0) {
          console.log('Удаление файлов:', filePaths);
          await apiClient.post('/storage/remove', {
            bucket: 'qualification-objects',
            paths: filePaths
          });

          console.log(`Удалены файлы из Storage: ${filePaths.join(', ')}`);
        } else {
          console.log('Нет файлов для удаления (все записи являются папками)');
        }
      } else {
        console.log('Файлы не найдены в Storage для удаления');
      }
    } catch (error: any) {
      console.error('Ошибка при удалении файла снятия логгеров:', error);
      throw new Error(`Ошибка удаления файлов: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получение списка файлов снятия логгеров из Storage
  async getLoggerRemovalFiles(objectId: string, projectId?: string): Promise<{ [key: string]: { name: string; url: string; size: number; lastModified: string } }> {
    try {
      const prefix = this.buildProjectPath('logger-removal', objectId, projectId);
      const listResult = await apiClient.post<{ data: StorageFileObject[] }>('/storage/list', {
        bucket: 'qualification-objects',
        prefix: prefix
      });

      const filesMap: { [key: string]: { name: string; url: string; size: number; lastModified: string } } = {};
      const storageFolders: StorageFileObject[] = listResult.data || [];

      if (storageFolders.length > 0) {
        console.log('QualificationObjectService: Найдены папки в Storage:', storageFolders.map((f: StorageFileObject) => f.name));
        
        for (const folder of storageFolders) {
          // Пропускаем файлы, обрабатываем только папки
          if (folder.id) continue;

          console.log('QualificationObjectService: Обрабатываем папку:', folder.name);
          
          if (folder.name.startsWith('zone-') && folder.name.includes('-level-')) {
            console.log('QualificationObjectService: Папка соответствует паттерну зоны:', folder.name);
            
            const zoneListResult = await apiClient.post<{ data: StorageFileObject[] }>('/storage/list', {
              bucket: 'qualification-objects',
              prefix: `${prefix}/${folder.name}`
            });

            const zoneFileEntries: StorageFileObject[] = zoneListResult.data || [];

            console.log(
              'QualificationObjectService: Файлы в папке',
              folder.name,
              ':',
              zoneFileEntries.map((f: StorageFileObject) => f.name) || []
            );

            // Сортируем файлы по дате создания (новые первыми) и берем первый
            const sortedFiles = zoneFileEntries
              .filter(f => f.id) // Только файлы
              .sort((a, b) => {
                const dateA = new Date(a.created_at || a.updated_at || 0).getTime();
                const dateB = new Date(b.created_at || b.updated_at || 0).getTime();
                return dateB - dateA;
              });

            if (sortedFiles.length > 0) {
              const latestFile = sortedFiles[0];
              const fileKey = folder.name; // zone-1-level-0
              
              console.log('QualificationObjectService: Выбран файл для папки', folder.name, ':', latestFile.name);
              
              const urlResult = await apiClient.post<{ data: { publicUrl: string } }>('/storage/get-public-url', {
                bucket: 'qualification-objects',
                path: `${prefix}/${folder.name}/${latestFile.name}`
              });

              filesMap[fileKey] = {
                name: latestFile.name,
                url: urlResult.data?.publicUrl || `/uploads/qualification-objects/${prefix}/${folder.name}/${latestFile.name}`,
                size: latestFile.metadata?.size || 0,
                lastModified: latestFile.updated_at || latestFile.created_at || new Date().toISOString()
              };
              
              console.log('QualificationObjectService: Добавлен файл в карту:', fileKey, latestFile.name);
            } else {
              console.log('QualificationObjectService: Нет файлов в папке', folder.name);
            }
          } else {
            console.log('QualificationObjectService: Папка не соответствует паттерну зоны:', folder.name);
          }
        }
      } else {
        console.log('QualificationObjectService: Нет папок в Storage для объекта:', objectId);
      }

      return filesMap;
    } catch (error: any) {
      console.error('Ошибка получения файлов снятия логгеров:', error);
      return {};
    }
  }
}

export const qualificationObjectService = new QualificationObjectService();