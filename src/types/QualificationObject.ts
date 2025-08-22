export type QualificationObjectType = 
  | 'помещение'
  | 'автомобиль'
  | 'холодильная_камера'
  | 'холодильник'
  | 'морозильник';

export interface QualificationObject {
  id: string;
  contractorId: string;
  type: QualificationObjectType;
  
  // Общие поля
  name?: string;
  climateSystem?: string;
  planFileUrl?: string;
  planFileName?: string;
  
  // Поля для помещений
  address?: string;
  latitude?: number;
  longitude?: number;
  geocodedAt?: Date;
  area?: number;
  
  // Поля для автомобилей
  vin?: string;
  registrationNumber?: string;
  bodyVolume?: number;
  
  // Поля для холодильных камер
  inventoryNumber?: string;
  chamberVolume?: number;
  
  // Поля для холодильников и морозильников
  serialNumber?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQualificationObjectData {
  contractorId: string;
  type: QualificationObjectType;
  name?: string;
  address?: string;
  area?: number;
  climateSystem?: string;
  planFile?: File;
  vin?: string;
  registrationNumber?: string;
  bodyVolume?: number;
  inventoryNumber?: string;
  chamberVolume?: number;
  serialNumber?: string;
}

export interface UpdateQualificationObjectData {
  name?: string;
  address?: string;
  area?: number;
  climateSystem?: string;
  planFile?: File;
  vin?: string;
  registrationNumber?: string;
  bodyVolume?: number;
  inventoryNumber?: string;
  chamberVolume?: number;
  serialNumber?: string;
}

export const QualificationObjectTypeLabels: Record<QualificationObjectType, string> = {
  'помещение': 'Помещение',
  'автомобиль': 'Автомобиль',
  'холодильная_камера': 'Холодильная камера',
  'холодильник': 'Холодильник',
  'морозильник': 'Морозильник'
};

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}