import { supabase } from './database';
import { QualificationObject, CreateQualificationObjectData } from '../types/QualificationObject';

class QualificationObjectService {
  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!supabase;
  }

  // Получение всех объектов квалификации
  async getAllQualificationObjects(): Promise<QualificationObject[]> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const { data, error } = await supabase
      .from('qualification_objects')
      .select(`
        *,
        contractor:contractors(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Ошибка загрузки объектов квалификации: ${error.message}`);
    }

    return data.map(this.mapFromDatabase);
  }

  // Получение объектов квалификации по контрагенту
  async getQualificationObjectsByContractor(contractorId: string): Promise<QualificationObject[]> {
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

  // Создание нового объекта квалификации
  async createQualificationObject(data: CreateQualificationObjectData): Promise<QualificationObject> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const dbData = this.mapToDatabase(data);

    const { data: result, error } = await supabase
      .from('qualification_objects')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка создания объекта квалификации: ${error.message}`);
    }

    return this.mapFromDatabase(result);
  }

  // Обновление объекта квалификации
  async updateQualificationObject(id: string, data: Partial<CreateQualificationObjectData>): Promise<QualificationObject> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const dbData = this.mapToDatabase(data);

    const { data: result, error } = await supabase
      .from('qualification_objects')
      .update(dbData)
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
  async uploadPlanFile(objectId: string, file: File): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const fileName = `plans/${objectId}/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from('qualification-objects')
      .upload(fileName, file);

    if (error) {
      throw new Error(`Ошибка загрузки файла плана: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('qualification-objects')
      .getPublicUrl(fileName);

    // Обновляем объект с URL файла
    await this.updateQualificationObject(objectId, {
      planFileUrl: urlData.publicUrl,
      planFileName: file.name
    });

    return urlData.publicUrl;
  }

  // Загрузка файла данных испытаний
  async uploadTestDataFile(objectId: string, file: File): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const fileName = `test-data/${objectId}/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from('qualification-objects')
      .upload(fileName, file);

    if (error) {
      throw new Error(`Ошибка загрузки файла данных испытаний: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('qualification-objects')
      .getPublicUrl(fileName);

    // Обновляем объект с URL файла
    await this.updateQualificationObject(objectId, {
      testDataFileUrl: urlData.publicUrl,
      testDataFileName: file.name
    });

    return urlData.publicUrl;
  }

  // Маппинг из базы данных в TypeScript объект
  private mapFromDatabase(dbObject: any): QualificationObject {
    return {
      id: dbObject.id,
      contractorId: dbObject.contractor_id,
      type: dbObject.type,
      name: dbObject.name,
      climateSystem: dbObject.climate_system,
      planFileUrl: dbObject.plan_file_url,
      planFileName: dbObject.plan_file_name,
      address: dbObject.address,
      latitude: dbObject.latitude ? parseFloat(dbObject.latitude) : undefined,
      longitude: dbObject.longitude ? parseFloat(dbObject.longitude) : undefined,
      geocodedAt: dbObject.geocoded_at,
      area: dbObject.area ? parseFloat(dbObject.area) : undefined,
      vin: dbObject.vin,
      registrationNumber: dbObject.registration_number,
      bodyVolume: dbObject.body_volume ? parseFloat(dbObject.body_volume) : undefined,
      inventoryNumber: dbObject.inventory_number,
      chamberVolume: dbObject.chamber_volume ? parseFloat(dbObject.chamber_volume) : undefined,
      serialNumber: dbObject.serial_number,
      testDataFileUrl: dbObject.test_data_file_url,
      testDataFileName: dbObject.test_data_file_name,
      createdAt: dbObject.created_at,
      updatedAt: dbObject.updated_at
    };
  }

  // Маппинг из TypeScript объекта в формат базы данных
  private mapToDatabase(object: Partial<CreateQualificationObjectData>): any {
    const dbObject: any = {};

    if (object.contractorId !== undefined) dbObject.contractor_id = object.contractorId;
    if (object.type !== undefined) dbObject.type = object.type;
    if (object.name !== undefined) dbObject.name = object.name;
    if (object.climateSystem !== undefined) dbObject.climate_system = object.climateSystem;
    if (object.planFileUrl !== undefined) dbObject.plan_file_url = object.planFileUrl;
    if (object.planFileName !== undefined) dbObject.plan_file_name = object.planFileName;
    if (object.address !== undefined) dbObject.address = object.address;
    if (object.latitude !== undefined) dbObject.latitude = object.latitude;
    if (object.longitude !== undefined) dbObject.longitude = object.longitude;
    if (object.geocodedAt !== undefined) dbObject.geocoded_at = object.geocodedAt;
    if (object.area !== undefined) dbObject.area = object.area;
    if (object.vin !== undefined) dbObject.vin = object.vin;
    if (object.registrationNumber !== undefined) dbObject.registration_number = object.registrationNumber;
    if (object.bodyVolume !== undefined) dbObject.body_volume = object.bodyVolume;
    if (object.inventoryNumber !== undefined) dbObject.inventory_number = object.inventoryNumber;
    if (object.chamberVolume !== undefined) dbObject.chamber_volume = object.chamberVolume;
    if (object.serialNumber !== undefined) dbObject.serial_number = object.serialNumber;
    if (object.testDataFileUrl !== undefined) dbObject.test_data_file_url = object.testDataFileUrl;
    if (object.testDataFileName !== undefined) dbObject.test_data_file_name = object.testDataFileName;

    return dbObject;
  }
}

export const qualificationObjectService = new QualificationObjectService();