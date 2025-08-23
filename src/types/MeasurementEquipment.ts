export type EquipmentType = '-' | 'Testo 174T' | 'Testo 174H';

export interface EquipmentVerification {
  id: string;
  equipmentId: string;
  verificationStartDate: Date;
  verificationEndDate: Date;
  verificationFileUrl?: string;
  verificationFileName?: string;
  createdAt: Date;
}

export interface MeasurementEquipment {
  id: string;
  type: EquipmentType;
  name: string;
  serialNumber: string;
  createdAt: Date;
  updatedAt: Date;
  verifications: EquipmentVerification[];
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

export interface CreateEquipmentVerificationData {
  equipmentId: string;
  verificationStartDate: Date;
  verificationEndDate: Date;
  verificationFile?: File;
}

export interface DatabaseMeasurementEquipment {
  id: string;
  type: EquipmentType;
  name: string;
  serial_number: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseEquipmentVerification {
  id: string;
  equipment_id: string;
  verification_start_date: string;
  verification_end_date: string;
  verification_file_url: string | null;
  verification_file_name: string | null;
  created_at: string;
}