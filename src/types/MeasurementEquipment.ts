export interface MeasurementEquipment {
  id: string;
  type: string;
  name: string;
  serialNumber: string;
  verificationDueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMeasurementEquipmentData {
  type: string;
  name: string;
  serialNumber: string;
  verificationDueDate: Date;
}

export interface UpdateMeasurementEquipmentData {
  type?: string;
  name?: string;
  serialNumber?: string;
  verificationDueDate?: Date;
}

export interface DatabaseMeasurementEquipment {
  id: string;
  type: string;
  name: string;
  serial_number: string;
  verification_due_date: string;
  created_at: string;
  updated_at: string;
}