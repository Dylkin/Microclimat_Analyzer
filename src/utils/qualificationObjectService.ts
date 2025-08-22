import { createClient } from '@supabase/supabase-js';
import { 
  QualificationObject, 
  QualificationObjectType,
  CreateQualificationObjectData, 
  UpdateQualificationObjectData,
  GeocodeResult 
} from '../types/QualificationObject';

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

export interface DatabaseQualificationObject {
  id: string;
  contractor_id: string;
  type: QualificationObjectType;
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_at: string | null;
  area: number | null;
  climate_system: string | null;
  plan_file_url: string | null;
  plan_file_name: string | null;
  vin: string | null;
  registration_number: string | null;
  body_volume: number | null;
  inventory_number: string | null;
  chamber_volume: number | null;
  serial_number: string | null;
  created_at: string;
  updated_at: string;
}

export class QualificationObjectService {
  private supabase: any;

  constructor() {
    this.supabase = initSupabase();
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Геокодирование адреса через OpenStreetMap Nominatim API
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!address.trim()) return null;

    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Ошибка геокодирования');
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          formattedAddress: result.display_name
        };
      }

      return null;
    } catch (error) {
      console.error('Ошибка геокодирования:', error);
      return null;
    }
  }

  // Загрузка файла плана
  async uploadPlanFile(file: File, objectId: string): Promise<{ url: string; fileName: string } | null> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${objectId}_${Date.now()}.${fileExt}`;
      const filePath = `qualification-objects/${fileName}`;

      const { data, error } = await this.supabase.storage
        .from('plans')
        .upload(filePath, file);

      if (error) {
        console.error('Ошибка загрузки файла:', error);
        return null;
      }

      const { data: urlData } = this.supabase.storage
        .from('plans')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        fileName: file.name
      };
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      return null;
    }
  }

  // Получение всех объектов квалификации для контрагента
  async getQualificationObjects(contractorId: string): Promise<QualificationObject[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('qualification_objects')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Ошибка получения объектов квалификации:', error);
        throw new Error(`Ошибка получения объектов квалификации: ${error.message}`);
      }

      return data.map((obj: DatabaseQualificationObject) => ({
        id: obj.id,
        contractorId: obj.contractor_id,
        type: obj.type,
        name: obj.name || undefined,
        address: obj.address || undefined,
        latitude: obj.latitude || undefined,
        longitude: obj.longitude || undefined,
        geocodedAt: obj.geocoded_at ? new Date(obj.geocoded_at) : undefined,
        area: obj.area || undefined,
        climateSystem: obj.climate_system || undefined,
        planFileUrl: obj.plan_file_url || undefined,
        planFileName: obj.plan_file_name || undefined,
        vin: obj.vin || undefined,
        registrationNumber: obj.registration_number || undefined,
        bodyVolume: obj.body_volume || undefined,
        inventoryNumber: obj.inventory_number || undefined,
        chamberVolume: obj.chamber_volume || undefined,
        serialNumber: obj.serial_number || undefined,
        createdAt: new Date(obj.created_at),
        updatedAt: new Date(obj.updated_at)
      }));
    } catch (error) {
      console.error('Ошибка при получении объектов квалификации:', error);
      throw error;
    }
  }

  // Получение всех объектов квалификации
  async getAllQualificationObjects(): Promise<QualificationObject[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('qualification_objects')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Ошибка получения всех объектов квалификации:', error);
        throw new Error(`Ошибка получения объектов квалификации: ${error.message}`);
      }

      return data.map((obj: DatabaseQualificationObject) => ({
        id: obj.id,
        contractorId: obj.contractor_id,
        type: obj.type,
        name: obj.name || undefined,
        address: obj.address || undefined,
        latitude: obj.latitude || undefined,
        longitude: obj.longitude || undefined,
        geocodedAt: obj.geocoded_at ? new Date(obj.geocoded_at) : undefined,
        area: obj.area || undefined,
        climateSystem: obj.climate_system || undefined,
        planFileUrl: obj.plan_file_url || undefined,
        planFileName: obj.plan_file_name || undefined,
        vin: obj.vin || undefined,
        registrationNumber: obj.registration_number || undefined,
        bodyVolume: obj.body_volume || undefined,
        inventoryNumber: obj.inventory_number || undefined,
        chamberVolume: obj.chamber_volume || undefined,
        serialNumber: obj.serial_number || undefined,
        createdAt: new Date(obj.created_at),
        updatedAt: new Date(obj.updated_at)
      }));
    } catch (error) {
      console.error('Ошибка при получении всех объектов квалификации:', error);
      throw error;
    }
  }

  // Добавление объекта квалификации
  async addQualificationObject(objectData: CreateQualificationObjectData): Promise<QualificationObject> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Добавляем объект квалификации:', objectData);

      // Геокодируем адрес если он указан (для помещений)
      let geocodeResult: GeocodeResult | null = null;
      if (objectData.address && objectData.type === 'помещение') {
        geocodeResult = await this.geocodeAddress(objectData.address);
      }

      // Подготавливаем данные для вставки
      const insertData: any = {
        contractor_id: objectData.contractorId,
        type: objectData.type,
        name: objectData.name || null,
        address: objectData.address || null,
        latitude: geocodeResult?.latitude || null,
        longitude: geocodeResult?.longitude || null,
        geocoded_at: geocodeResult ? new Date().toISOString() : null,
        area: objectData.area || null,
        climate_system: objectData.climateSystem || null,
        vin: objectData.vin || null,
        registration_number: objectData.registrationNumber || null,
        body_volume: objectData.bodyVolume || null,
        inventory_number: objectData.inventoryNumber || null,
        chamber_volume: objectData.chamberVolume || null,
        serial_number: objectData.serialNumber || null
      };

      // Добавляем объект
      const { data: objectResult, error: objectError } = await this.supabase
        .from('qualification_objects')
        .insert(insertData)
        .select()
        .single();

      if (objectError) {
        console.error('Ошибка добавления объекта квалификации:', objectError);
        throw new Error(`Ошибка добавления объекта квалификации: ${objectError.message}`);
      }

      // Загружаем файл плана если он есть
      if (objectData.planFile) {
        const fileResult = await this.uploadPlanFile(objectData.planFile, objectResult.id);
        if (fileResult) {
          // Обновляем объект с информацией о файле
          const { error: updateError } = await this.supabase
            .from('qualification_objects')
            .update({
              plan_file_url: fileResult.url,
              plan_file_name: fileResult.fileName
            })
            .eq('id', objectResult.id);

          if (updateError) {
            console.error('Ошибка обновления информации о файле:', updateError);
          } else {
            objectResult.plan_file_url = fileResult.url;
            objectResult.plan_file_name = fileResult.fileName;
          }
        }
      }

      console.log('Объект квалификации успешно добавлен:', objectResult);

      return {
        id: objectResult.id,
        contractorId: objectResult.contractor_id,
        type: objectResult.type,
        name: objectResult.name || undefined,
        address: objectResult.address || undefined,
        latitude: objectResult.latitude || undefined,
        longitude: objectResult.longitude || undefined,
        geocodedAt: objectResult.geocoded_at ? new Date(objectResult.geocoded_at) : undefined,
        area: objectResult.area || undefined,
        climateSystem: objectResult.climate_system || undefined,
        planFileUrl: objectResult.plan_file_url || undefined,
        planFileName: objectResult.plan_file_name || undefined,
        vin: objectResult.vin || undefined,
        registrationNumber: objectResult.registration_number || undefined,
        bodyVolume: objectResult.body_volume || undefined,
        inventoryNumber: objectResult.inventory_number || undefined,
        chamberVolume: objectResult.chamber_volume || undefined,
        serialNumber: objectResult.serial_number || undefined,
        createdAt: new Date(objectResult.created_at),
        updatedAt: new Date(objectResult.updated_at)
      };
    } catch (error) {
      console.error('Ошибка при добавлении объекта квалификации:', error);
      throw error;
    }
  }

  // Обновление объекта квалификации
  async updateQualificationObject(id: string, updates: UpdateQualificationObjectData): Promise<QualificationObject> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.address !== undefined) {
        updateData.address = updates.address;
        
        // Если адрес изменился, выполняем геокодирование
        if (updates.address) {
          const geocodeResult = await this.geocodeAddress(updates.address);
          if (geocodeResult) {
            updateData.latitude = geocodeResult.latitude;
            updateData.longitude = geocodeResult.longitude;
            updateData.geocoded_at = new Date().toISOString();
          }
        } else {
          updateData.latitude = null;
          updateData.longitude = null;
          updateData.geocoded_at = null;
        }
      }
      if (updates.area !== undefined) updateData.area = updates.area;
      if (updates.climateSystem !== undefined) updateData.climate_system = updates.climateSystem;
      if (updates.vin !== undefined) updateData.vin = updates.vin;
      if (updates.registrationNumber !== undefined) updateData.registration_number = updates.registrationNumber;
      if (updates.bodyVolume !== undefined) updateData.body_volume = updates.bodyVolume;
      if (updates.inventoryNumber !== undefined) updateData.inventory_number = updates.inventoryNumber;
      if (updates.chamberVolume !== undefined) updateData.chamber_volume = updates.chamberVolume;
      if (updates.serialNumber !== undefined) updateData.serial_number = updates.serialNumber;

      // Загружаем новый файл плана если он есть
      if (updates.planFile) {
        const fileResult = await this.uploadPlanFile(updates.planFile, id);
        if (fileResult) {
          updateData.plan_file_url = fileResult.url;
          updateData.plan_file_name = fileResult.fileName;
        }
      }

      const { data, error } = await this.supabase
        .from('qualification_objects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Ошибка обновления объекта квалификации:', error);
        throw new Error(`Ошибка обновления объекта квалификации: ${error.message}`);
      }

      return {
        id: data.id,
        contractorId: data.contractor_id,
        type: data.type,
        name: data.name || undefined,
        address: data.address || undefined,
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
        geocodedAt: data.geocoded_at ? new Date(data.geocoded_at) : undefined,
        area: data.area || undefined,
        climateSystem: data.climate_system || undefined,
        planFileUrl: data.plan_file_url || undefined,
        planFileName: data.plan_file_name || undefined,
        vin: data.vin || undefined,
        registrationNumber: data.registration_number || undefined,
        bodyVolume: data.body_volume || undefined,
        inventoryNumber: data.inventory_number || undefined,
        chamberVolume: data.chamber_volume || undefined,
        serialNumber: data.serial_number || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Ошибка при обновлении объекта квалификации:', error);
      throw error;
    }
  }

  // Удаление объекта квалификации
  async deleteQualificationObject(id: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await this.supabase
        .from('qualification_objects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Ошибка удаления объекта квалификации:', error);
        throw new Error(`Ошибка удаления объекта квалификации: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении объекта квалификации:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const qualificationObjectService = new QualificationObjectService();