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
  address?: string;
  latitude?: number;
  longitude?: number;
  geocodedAt?: Date;
  area?: number;
  vin?: string;
  registrationNumber?: string;
  bodyVolume?: number;
  inventoryNumber?: string;
  chamberVolume?: number;
  serialNumber?: string;
  testDataFileUrl?: string;
  testDataFileName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateQualificationObjectData {
  contractorId: string;
  type: QualificationObjectType;
  name?: string;
  climateSystem?: string;
  planFile?: File;
  address?: string;
  latitude?: number;
  longitude?: number;
  area?: number;
  vin?: string;
  registrationNumber?: string;
  bodyVolume?: number;
  inventoryNumber?: string;
  chamberVolume?: number;
  serialNumber?: string;
  testDataFile?: File;
}