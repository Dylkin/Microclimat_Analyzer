import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase клиента
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Типы для объектов квалификации
export type QualificationObjectType = 
  | 'помещение'
  | 'автомобиль' 
  | 'холодильная_камера'
  | 'холодильник'
  | 'морозильник';

export const QualificationObjectTypeLabels: Record<QualificationObjectType, string> = {
  'помещение': 'Помещение',
  'автомобиль': 'Автомобиль',
  'холодильная_камера': 'Холодильная камера',
  'холодильник': 'Холодильник',
  'морозильник': 'Морозильник'
};

export interface QualificationObject {
  id: string;
  contractorId: string;
  type: QualificationObjectType;
  name?: string;
  climateSystem?: string;
  planFileUrl?: string;
  planFileName?: string;
  testDataFileUrl?: string;
  testDataFileName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  geocodedAt?: string;
  area?: number;
  vin?: string;
  registrationNumber?: string;
  bodyVolume?: number;
  inventoryNumber?: string;
  chamberVolume?: number;
  serialNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateQualificationObjectData {
  contractorId: string;
  type: QualificationObjectType;
  name?: string;
  climateSystem?: string;
  address?: string;
  area?: number;
  vin?: string;
  registrationNumber?: string;
  bodyVolume?: number;
  inventoryNumber?: string;
  chamberVolume?: number;
  serialNumber?: string;
}

export interface UpdateQualificationObjectData {
  type?: QualificationObjectType;
  name?: string;
  climateSystem?: string;
  address?: string;
  area?: number;
  vin?: string;
  registrationNumber?: string;
  bodyVolume?: number;
  inventoryNumber?: string;
  chamberVolume?: number;
  serialNumber?: string;
}

class QualificationObjectService {
  // Проверка доступности Supabase
  isAvailable(): boolean {
    return supabase !== null;
  }

  // Получение объектов квалификации по контрагенту
  async getQualificationObjects(contractorId: string): Promise<QualificationObject[]> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const { data, error } = await supabase
      .from('qualification_objects')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Ошибка загрузки объектов квалификации: ${error.message}`);
    }

    return data.map(this.mapFromDatabase);
  }

  // Создание объекта квалификации
  async createQualificationObject(data: CreateQualificationObjectData): Promise<QualificationObject> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const { data: result, error } = await supabase
      .from('qualification_objects')
      .insert([this.mapToDatabase(data)])
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка создания объекта квалификации: ${error.message}`);
    }

    return this.mapFromDatabase(result);
  }

  // Обновление объекта квалификации
  async updateQualificationObject(id: string, data: UpdateQualificationObjectData): Promise<QualificationObject> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const { data: result, error } = await supabase
      .from('qualification_objects')
      .update(this.mapToDatabase(data))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка обновления объекта квалификации: ${error.message}`);
    }

    return this.mapFromDatabase(result);
  }

  // Удаление объекта квалификации
  async deleteQualificationObject(id: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const { error } = await supabase
      .from('qualification_objects')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Ошибка удаления объекта квалификации: ${error.message}`);
    }
  }

  // Загрузка файла плана
  async uploadPlanFile(file: File): Promise<{ url: string; fileName: string }> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `plans/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('qualification-objects')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Ошибка загрузки файла плана: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('qualification-objects')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      fileName: file.name
    };
  }

  // Загрузка файла данных испытаний
  async uploadTestDataFile(file: File): Promise<{ url: string; fileName: string }> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `test-data/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('qualification-objects')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Ошибка загрузки файла данных испытаний: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('qualification-objects')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      fileName: file.name
    };
  }

  // Обновление файла плана
  async updatePlanFile(objectId: string, file: File): Promise<{ url: string; fileName: string }> {
    const { url, fileName } = await this.uploadPlanFile(file);
    
    await this.updateQualificationObject(objectId, {
      planFileUrl: url,
      planFileName: fileName
    });

    return { url, fileName };
  }

  // Обновление файла данных испытаний
  async updateTestDataFile(objectId: string, file: File): Promise<{ url: string; fileName: string }> {
    const { url, fileName } = await this.uploadTestDataFile(file);
    
    await this.updateQualificationObject(objectId, {
      testDataFileUrl: url,
      testDataFileName: fileName
    });

    return { url, fileName };
  }

  // Маппинг из базы данных
  private mapFromDatabase(data: any): QualificationObject {
    return {
      id: data.id,
      contractorId: data.contractor_id,
      type: data.type,
      name: data.name,
      climateSystem: data.climate_system,
      planFileUrl: data.plan_file_url,
      planFileName: data.plan_file_name,
      testDataFileUrl: data.test_data_file_url,
      testDataFileName: data.test_data_file_name,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      geocodedAt: data.geocoded_at,
      area: data.area,
      vin: data.vin,
      registrationNumber: data.registration_number,
      bodyVolume: data.body_volume,
      inventoryNumber: data.inventory_number,
      chamberVolume: data.chamber_volume,
      serialNumber: data.serial_number,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  // Маппинг в базу данных
  private mapToDatabase(data: CreateQualificationObjectData | UpdateQualificationObjectData): any {
    const mapped: any = {};
    
    if ('contractorId' in data) mapped.contractor_id = data.contractorId;
    if (data.type !== undefined) mapped.type = data.type;
    if (data.name !== undefined) mapped.name = data.name;
    if (data.climateSystem !== undefined) mapped.climate_system = data.climateSystem;
    if (data.address !== undefined) mapped.address = data.address;
    if (data.area !== undefined) mapped.area = data.area;
    if (data.vin !== undefined) mapped.vin = data.vin;
    if (data.registrationNumber !== undefined) mapped.registration_number = data.registrationNumber;
    if (data.bodyVolume !== undefined) mapped.body_volume = data.bodyVolume;
    if (data.inventoryNumber !== undefined) mapped.inventory_number = data.inventoryNumber;
    if (data.chamberVolume !== undefined) mapped.chamber_volume = data.chamberVolume;
    if (data.serialNumber !== undefined) mapped.serial_number = data.serialNumber;

    return mapped;
  }
}

export const qualificationObjectService = new QualificationObjectService();