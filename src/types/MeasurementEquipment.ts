export type EquipmentType = '-' | 'Testo 174T' | 'Testo 174H';

export const EquipmentTypeLabels: Record<EquipmentType, string> = {
  '-': 'Не указан',
  'Testo 174T': 'Testo 174T',
  'Testo 174H': 'Testo 174H'
};

export interface MeasurementEquipment {
  id: string;
  type: EquipmentType;
  name: string;
  serialNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMeasurementEquipmentData {
  type: EquipmentType;
  name: string;
  serialNumber: string;
}

export interface UpdateMeasurementEquipmentData {
  type?: EquipmentType;
  name?: string;
  serialNumber?: string;
}