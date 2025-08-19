import { createClient } from '@supabase/supabase-js';
import { 
  QualificationObject, 
  CreateQualificationObjectData, 
  UpdateQualificationObjectData,
  ObjectType,
  RoomData
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
  object_type: ObjectType;
  data: any;
  plan_file_url: string | null;
  plan_file_name: string | null;
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

  // Геокодирование адреса для помещений
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
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
          longitude: parseFloat(result.lon)
        };
      }

      return null;
    } catch (error) {
      console.error('Ошибка геокодирования:', error);
      return null;
    }
  }

  // Загрузка файла плана
  async uploadPlanFile(file: File, objectId: string): Promise<{ url: string; fileName: string }> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        throw new Error('Можно загружать только изображения');
      }

      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `${objectId}_${Date.now()}.${fileExt}`;
      const filePath = `qualification-objects/${fileName}`;

      // Загружаем файл в Supabase Storage
      const { data, error } = await this.supabase.storage
        .from('plans')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Ошибка загрузки файла:', error);
        throw new Error(`Ошибка загрузки файла: ${error.message}`);
      }

      // Получаем публичный URL
      const { data: urlData } = this.supabase.storage
        .from('plans')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        fileName: file.name
      };
    } catch (error) {
      console.error('Ошибка при загрузке файла плана:', error);
      throw error;
    }
  }

  // Удаление файла плана
  async deletePlanFile(fileUrl: string): Promise<void> {
    if (!this.supabase || !fileUrl) return;

    try {
      // Извлекаем путь к файлу из URL
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `qualification-objects/${fileName}`;

      const { error } = await this.supabase.storage
        .from('plans')
        .remove([filePath]);

      if (error) {
        console.error('Ошибка удаления файла:', error);
      }
    } catch (error) {
      console.error('Ошибка при удалении файла плана:', error);
    }
  }

  // Получение всех объектов квалификации для контрагента
  async getObjectsByContractor(contractorId: string): Promise<QualificationObject[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('qualification_objects')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка получения объектов квалификации:', error);
        throw new Error(`Ошибка получения объектов квалификации: ${error.message}`);
      }

      return data.map((obj: DatabaseQualificationObject) => ({
        id: obj.id,
        contractorId: obj.contractor_id,
        objectType: obj.object_type,
        data: obj.data,
        planFileUrl: obj.plan_file_url || undefined,
        planFileName: obj.plan_file_name || undefined,
        createdAt: new Date(obj.created_at),
        updatedAt: new Date(obj.updated_at)
      }));
    } catch (error) {
      console.error('Ошибка при получении объектов квалификации:', error);
      throw error;
    }
  }

  // Добавление нового объекта квалификации
  async addObject(objectData: CreateQualificationObjectData): Promise<QualificationObject> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Добавляем объект квалификации:', objectData);

      // Обрабатываем геокодирование для помещений
      let processedData = { ...objectData.data };
      if (objectData.objectType === 'помещение') {
        const roomData = objectData.data as RoomData;
        if (roomData.address) {
          const geocodeResult = await this.geocodeAddress(roomData.address);
          if (geocodeResult) {
            processedData = {
              ...processedData,
              latitude: geocodeResult.latitude,
              longitude: geocodeResult.longitude,
              geocodedAt: new Date()
            };
          }
        }
      }

      // Добавляем объект в базу данных
      const { data: objectResult, error: objectError } = await this.supabase
        .from('qualification_objects')
        .insert({
          contractor_id: objectData.contractorId,
          object_type: objectData.objectType,
          data: processedData
        })
        .select()
        .single();

      if (objectError) {
        console.error('Ошибка добавления объекта квалификации:', objectError);
        throw new Error(`Ошибка добавления объекта квалификации: ${objectError.message}`);
      }

      // Загружаем файл плана если он есть
      let planFileUrl: string | undefined;
      let planFileName: string | undefined;

      if (objectData.planFile) {
        try {
          const uploadResult = await this.uploadPlanFile(objectData.planFile, objectResult.id);
          planFileUrl = uploadResult.url;
          planFileName = uploadResult.fileName;

          // Обновляем объект с информацией о файле
          const { error: updateError } = await this.supabase
            .from('qualification_objects')
            .update({
              plan_file_url: planFileUrl,
              plan_file_name: planFileName
            })
            .eq('id', objectResult.id);

          if (updateError) {
            console.error('Ошибка обновления информации о файле:', updateError);
          }
        } catch (fileError) {
          console.error('Ошибка загрузки файла плана:', fileError);
          // Не прерываем выполнение, объект уже создан
        }
      }

      console.log('Объект квалификации успешно добавлен:', objectResult);

      return {
        id: objectResult.id,
        contractorId: objectResult.contractor_id,
        objectType: objectResult.object_type,
        data: objectResult.data,
        planFileUrl,
        planFileName,
        createdAt: new Date(objectResult.created_at),
        updatedAt: new Date(objectResult.updated_at)
      };
    } catch (error) {
      console.error('Ошибка при добавлении объекта квалификации:', error);
      throw error;
    }
  }

  // Обновление объекта квалификации
  async updateObject(id: string, updates: UpdateQualificationObjectData): Promise<QualificationObject> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Получаем текущий объект
      const { data: currentObject, error: fetchError } = await this.supabase
        .from('qualification_objects')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Ошибка получения объекта: ${fetchError.message}`);
      }

      const updateData: any = {};

      // Обрабатываем обновление данных
      if (updates.data) {
        let processedData = { ...updates.data };
        
        // Геокодирование для помещений
        if (currentObject.object_type === 'помещение') {
          const roomData = updates.data as RoomData;
          if (roomData.address && roomData.address !== currentObject.data.address) {
            const geocodeResult = await this.geocodeAddress(roomData.address);
            if (geocodeResult) {
              processedData = {
                ...processedData,
                latitude: geocodeResult.latitude,
                longitude: geocodeResult.longitude,
                geocodedAt: new Date()
              };
            }
          }
        }
        
        updateData.data = processedData;
      }

      // Обрабатываем файл плана
      if (updates.removePlanFile) {
        // Удаляем файл
        if (currentObject.plan_file_url) {
          await this.deletePlanFile(currentObject.plan_file_url);
        }
        updateData.plan_file_url = null;
        updateData.plan_file_name = null;
      } else if (updates.planFile) {
        // Удаляем старый файл если есть
        if (currentObject.plan_file_url) {
          await this.deletePlanFile(currentObject.plan_file_url);
        }
        
        // Загружаем новый файл
        const uploadResult = await this.uploadPlanFile(updates.planFile, id);
        updateData.plan_file_url = uploadResult.url;
        updateData.plan_file_name = uploadResult.fileName;
      }

      // Обновляем объект в базе данных
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
        objectType: data.object_type,
        data: data.data,
        planFileUrl: data.plan_file_url || undefined,
        planFileName: data.plan_file_name || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Ошибка при обновлении объекта квалификации:', error);
      throw error;
    }
  }

  // Удаление объекта квалификации
  async deleteObject(id: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Получаем информацию об объекте для удаления файла
      const { data: objectData, error: fetchError } = await this.supabase
        .from('qualification_objects')
        .select('plan_file_url')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Ошибка получения объекта для удаления:', fetchError);
      }

      // Удаляем файл плана если есть
      if (objectData?.plan_file_url) {
        await this.deletePlanFile(objectData.plan_file_url);
      }

      // Удаляем объект из базы данных
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