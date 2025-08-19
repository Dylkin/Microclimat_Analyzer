export type ObjectType = 
  | 'помещение'
  | 'автомобиль'
  | 'холодильная_камера'
  | 'холодильник'
  | 'морозильник';

// Базовый интерфейс для всех объектов квалификации
export interface BaseQualificationObject {
  id: string;
  contractorId: string;
  objectType: ObjectType;
  planFileUrl?: string;
  planFileName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Специфичные данные для каждого типа объекта
export interface RoomData {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  geocodedAt?: Date;
  area: number; // площадь в м²
  climateSystem: string;
}

export interface VehicleData {
  vin: string;
  registrationNumber: string;
  climateSystem: string;
  bodyVolume: number; // объем кузова в м³
}

export interface ColdRoomData {
  name: string;
  inventoryNumber: string;
  climateSystem: string;
  volume: number; // объем камеры в м³
}

export interface RefrigeratorData {
  serialNumber: string;
  inventoryNumber: string;
}

export interface FreezerData {
  serialNumber: string;
  inventoryNumber: string;
}

// Типизированные интерфейсы для каждого типа объекта
export interface RoomObject extends BaseQualificationObject {
  objectType: 'помещение';
  data: RoomData;
}

export interface VehicleObject extends BaseQualificationObject {
  objectType: 'автомобиль';
  data: VehicleData;
}

export interface ColdRoomObject extends BaseQualificationObject {
  objectType: 'холодильная_камера';
  data: ColdRoomData;
}

export interface RefrigeratorObject extends BaseQualificationObject {
  objectType: 'холодильник';
  data: RefrigeratorData;
}

export interface FreezerObject extends BaseQualificationObject {
  objectType: 'морозильник';
  data: FreezerData;
}

// Union type для всех объектов квалификации
export type QualificationObject = 
  | RoomObject 
  | VehicleObject 
  | ColdRoomObject 
  | RefrigeratorObject 
  | FreezerObject;

// Интерфейс для создания нового объекта
export interface CreateQualificationObjectData {
  contractorId: string;
  objectType: ObjectType;
  data: RoomData | VehicleData | ColdRoomData | RefrigeratorData | FreezerData;
  planFile?: File;
}

// Интерфейс для обновления объекта
export interface UpdateQualificationObjectData {
  data?: RoomData | VehicleData | ColdRoomData | RefrigeratorData | FreezerData;
  planFile?: File;
  removePlanFile?: boolean;
}

// Вспомогательные типы для форм
export type ObjectFormData = {
  [K in ObjectType]: K extends 'помещение' ? RoomData :
                     K extends 'автомобиль' ? VehicleData :
                     K extends 'холодильная_камера' ? ColdRoomData :
                     K extends 'холодильник' ? RefrigeratorData :
                     K extends 'морозильник' ? FreezerData :
                     never;
};

// Метаданные для типов объектов
export interface ObjectTypeMetadata {
  label: string;
  icon: string;
  supportsPlan: boolean;
  fields: {
    [key: string]: {
      label: string;
      type: 'text' | 'number' | 'address';
      required: boolean;
      unit?: string;
    };
  };
}

export const OBJECT_TYPE_METADATA: Record<ObjectType, ObjectTypeMetadata> = {
  'помещение': {
    label: 'Помещение',
    icon: '🏢',
    supportsPlan: true,
    fields: {
      name: { label: 'Наименование', type: 'text', required: true },
      address: { label: 'Адрес', type: 'address', required: true },
      area: { label: 'Площадь', type: 'number', required: true, unit: 'м²' },
      climateSystem: { label: 'Климатическая установка', type: 'text', required: true }
    }
  },
  'автомобиль': {
    label: 'Автомобиль',
    icon: '🚗',
    supportsPlan: false,
    fields: {
      vin: { label: 'VIN', type: 'text', required: true },
      registrationNumber: { label: 'Регистрационный номер', type: 'text', required: true },
      climateSystem: { label: 'Климатическая установка', type: 'text', required: true },
      bodyVolume: { label: 'Объем кузова', type: 'number', required: true, unit: 'м³' }
    }
  },
  'холодильная_камера': {
    label: 'Холодильная камера',
    icon: '❄️',
    supportsPlan: true,
    fields: {
      name: { label: 'Наименование', type: 'text', required: true },
      inventoryNumber: { label: 'Инвентарный №', type: 'text', required: true },
      climateSystem: { label: 'Климатическая установка', type: 'text', required: true },
      volume: { label: 'Объем камеры', type: 'number', required: true, unit: 'м³' }
    }
  },
  'холодильник': {
    label: 'Холодильник',
    icon: '🧊',
    supportsPlan: true,
    fields: {
      serialNumber: { label: 'Серийный №', type: 'text', required: true },
      inventoryNumber: { label: 'Инвентарный №', type: 'text', required: true }
    }
  },
  'морозильник': {
    label: 'Морозильник',
    icon: '🥶',
    supportsPlan: true,
    fields: {
      serialNumber: { label: 'Серийный №', type: 'text', required: true },
      inventoryNumber: { label: 'Инвентарный №', type: 'text', required: true }
    }
  }
};