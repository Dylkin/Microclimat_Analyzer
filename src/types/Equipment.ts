export type EquipmentType = '-' | 'Testo 174T' | 'Testo 174H';

export const EquipmentTypeLabels: Record<EquipmentType, string> = {
  '-': 'Не указано',
  'Testo 174T': 'Testo 174T',
  'Testo 174H': 'Testo 174H'
};

export const EquipmentTypeColors: Record<EquipmentType, string> = {
  '-': 'bg-gray-100 text-gray-800',
  'Testo 174T': 'bg-blue-100 text-blue-800',
  'Testo 174H': 'bg-green-100 text-green-800'
};

export interface Equipment {
  id: string;
  type: EquipmentType;
  name: string;
  serialNumber: string;
  createdAt: Date;
  updatedAt: Date;
  verifications: EquipmentVerification[];
}

export interface EquipmentVerification {
  id: string;
  equipmentId: string;
  verificationStartDate: Date;
  verificationEndDate: Date;
  verificationFileUrl?: string;
  verificationFileName?: string;
  createdAt: Date;
}

export interface CreateEquipmentData {
  type: EquipmentType;
  name: string;
  serialNumber: string;
  verifications?: Omit<EquipmentVerification, 'id' | 'equipmentId' | 'createdAt'>[];
}

export interface UpdateEquipmentData {
  type?: EquipmentType;
  name?: string;
  serialNumber?: string;
  verifications?: Array<Omit<EquipmentVerification, 'id' | 'equipmentId' | 'createdAt'> & { id?: string }>;
}