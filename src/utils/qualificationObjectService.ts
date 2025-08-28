import { supabase } from './database';
import { QualificationObject, QualificationObjectType, CreateQualificationObjectData } from '../types/QualificationObject';

class QualificationObjectService {
  isAvailable(): boolean {
    return !!supabase;
  }

  async getByContractorId(contractorId: string): Promise<QualificationObject[]> {
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

    return data || [];
  }

  async create(objectData: CreateQualificationObjectData): Promise<QualificationObject> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    let planFileUrl: string | undefined;
    let planFileName: string | undefined;
    let testDataFileUrl: string | undefined;
    let testDataFileName: string | undefined;

    // Загрузка файла плана
    if (objectData.planFile) {
      const planFileExt = objectData.planFile.name.split('.').pop();
      const planFilePath = `plans/${Date.now()}-${Math.random().toString(36).substring(2)}.${planFileExt}`;
      
      const { error: planUploadError } = await supabase.storage
        .from('qualification-objects')
        .upload(planFilePath, objectData.planFile);

      if (planUploadError) {
        throw new Error(`Ошибка загрузки файла плана: ${planUploadError.message}`);
      }

      const { data: planUrlData } = supabase.storage
        .from('qualification-objects')
        .getPublicUrl(planFilePath);

      planFileUrl = planUrlData.publicUrl;
      planFileName = objectData.planFile.name;
    }

    // Загрузка файла данных испытаний
    if (objectData.testDataFile) {
      const testFileExt = objectData.testDataFile.name.split('.').pop();
      const testFilePath = `test-data/${Date.now()}-${Math.random().toString(36).substring(2)}.${testFileExt}`;
      
      const { error: testUploadError } = await supabase.storage
        .from('qualification-objects')
        .upload(testFilePath, objectData.testDataFile);

      if (testUploadError) {
        throw new Error(`Ошибка загрузки файла данных испытаний: ${testUploadError.message}`);
      }

      const { data: testUrlData } = supabase.storage
        .from('qualification-objects')
        .getPublicUrl(testFilePath);

      testDataFileUrl = testUrlData.publicUrl;
      testDataFileName = objectData.testDataFile.name;
    }

    const { data, error } = await supabase
      .from('qualification_objects')
      .insert({
        contractor_id: objectData.contractorId,
        type: objectData.type,
        name: objectData.name,
        climate_system: objectData.climateSystem,
        plan_file_url: planFileUrl,
        plan_file_name: planFileName,
        address: objectData.address,
        latitude: objectData.latitude,
        longitude: objectData.longitude,
        area: objectData.area,
        vin: objectData.vin,
        registration_number: objectData.registrationNumber,
        body_volume: objectData.bodyVolume,
        inventory_number: objectData.inventoryNumber,
        chamber_volume: objectData.chamberVolume,
        serial_number: objectData.serialNumber,
        test_data_file_url: testDataFileUrl,
        test_data_file_name: testDataFileName
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка создания объекта квалификации: ${error.message}`);
    }

    return data;
  }

  async update(id: string, objectData: Partial<CreateQualificationObjectData>): Promise<QualificationObject> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    let planFileUrl: string | undefined;
    let planFileName: string | undefined;
    let testDataFileUrl: string | undefined;
    let testDataFileName: string | undefined;

    // Загрузка нового файла плана
    if (objectData.planFile) {
      const planFileExt = objectData.planFile.name.split('.').pop();
      const planFilePath = `plans/${Date.now()}-${Math.random().toString(36).substring(2)}.${planFileExt}`;
      
      const { error: planUploadError } = await supabase.storage
        .from('qualification-objects')
        .upload(planFilePath, objectData.planFile);

      if (planUploadError) {
        throw new Error(`Ошибка загрузки файла плана: ${planUploadError.message}`);
      }

      const { data: planUrlData } = supabase.storage
        .from('qualification-objects')
        .getPublicUrl(planFilePath);

      planFileUrl = planUrlData.publicUrl;
      planFileName = objectData.planFile.name;
    }

    // Загрузка нового файла данных испытаний
    if (objectData.testDataFile) {
      const testFileExt = objectData.testDataFile.name.split('.').pop();
      const testFilePath = `test-data/${Date.now()}-${Math.random().toString(36).substring(2)}.${testFileExt}`;
      
      const { error: testUploadError } = await supabase.storage
        .from('qualification-objects')
        .upload(testFilePath, objectData.testDataFile);

      if (testUploadError) {
        throw new Error(`Ошибка загрузки файла данных испытаний: ${testUploadError.message}`);
      }

      const { data: testUrlData } = supabase.storage
        .from('qualification-objects')
        .getPublicUrl(testFilePath);

      testDataFileUrl = testUrlData.publicUrl;
      testDataFileName = objectData.testDataFile.name;
    }

    const updateData: any = {};
    
    if (objectData.type !== undefined) updateData.type = objectData.type;
    if (objectData.name !== undefined) updateData.name = objectData.name;
    if (objectData.climateSystem !== undefined) updateData.climate_system = objectData.climateSystem;
    if (planFileUrl !== undefined) {
      updateData.plan_file_url = planFileUrl;
      updateData.plan_file_name = planFileName;
    }
    if (objectData.address !== undefined) updateData.address = objectData.address;
    if (objectData.latitude !== undefined) updateData.latitude = objectData.latitude;
    if (objectData.longitude !== undefined) updateData.longitude = objectData.longitude;
    if (objectData.area !== undefined) updateData.area = objectData.area;
    if (objectData.vin !== undefined) updateData.vin = objectData.vin;
    if (objectData.registrationNumber !== undefined) updateData.registration_number = objectData.registrationNumber;
    if (objectData.bodyVolume !== undefined) updateData.body_volume = objectData.bodyVolume;
    if (objectData.inventoryNumber !== undefined) updateData.inventory_number = objectData.inventoryNumber;
    if (objectData.chamberVolume !== undefined) updateData.chamber_volume = objectData.chamberVolume;
    if (objectData.serialNumber !== undefined) updateData.serial_number = objectData.serialNumber;
    if (testDataFileUrl !== undefined) {
      updateData.test_data_file_url = testDataFileUrl;
      updateData.test_data_file_name = testDataFileName;
    }

    const { data, error } = await supabase
      .from('qualification_objects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка обновления объекта квалификации: ${error.message}`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
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

  async getById(id: string): Promise<QualificationObject | null> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const { data, error } = await supabase
      .from('qualification_objects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Ошибка загрузки объекта квалификации: ${error.message}`);
    }

    return data;
  }
}

export const qualificationObjectService = new QualificationObjectService();