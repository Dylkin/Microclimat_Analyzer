export interface TechnicalSpecRange {
  enabled: boolean;
  values: string[];
  label?: string; // Название для пользовательских характеристик
}

export interface TechnicalSpecsRanges {
  [key: string]: TechnicalSpecRange;
}

export interface ManufacturerSupplier {
  manufacturer: string;
  supplierIds: string[];
}

export interface EquipmentSection {
  id: string;
  name: string;
  description?: string;
  manufacturers?: string[]; // Для обратной совместимости
  website?: string;
  supplierIds?: string[]; // Для обратной совместимости
  manufacturerSuppliers?: ManufacturerSupplier[]; // Новая структура: производитель -> поставщики
  channelsCount?: number;
  dosingVolume?: string;
  volumeStep?: string;
  dosingAccuracy?: string;
  reproducibility?: string;
  autoclavable?: boolean;
  inRegistrySI?: boolean;
  technicalSpecsRanges?: TechnicalSpecsRanges;
  cardsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipmentCard {
  id: string;
  sectionId: string;
  sectionName: string;
  name: string;
  manufacturer?: string;
  series?: string;
  channelsCount?: number;
  dosingVolume?: string;
  volumeStep?: string;
  dosingAccuracy?: string;
  reproducibility?: string;
  autoclavable?: boolean;
  specifications: Record<string, any>;
  externalUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEquipmentSectionData {
  name: string;
  description?: string;
  manufacturers?: string[]; // Для обратной совместимости
  website?: string;
  supplierIds?: string[]; // Для обратной совместимости
  manufacturerSuppliers?: ManufacturerSupplier[]; // Новая структура: производитель -> поставщики
  channelsCount?: number;
  dosingVolume?: string;
  volumeStep?: string;
  dosingAccuracy?: string;
  reproducibility?: string;
  autoclavable?: boolean;
  inRegistrySI?: boolean;
  technicalSpecsRanges?: TechnicalSpecsRanges;
}

export interface UpdateEquipmentSectionData {
  name?: string;
  description?: string;
  manufacturers?: string[]; // Для обратной совместимости
  website?: string;
  supplierIds?: string[]; // Для обратной совместимости
  manufacturerSuppliers?: ManufacturerSupplier[]; // Новая структура: производитель -> поставщики
  channelsCount?: number;
  dosingVolume?: string;
  volumeStep?: string;
  dosingAccuracy?: string;
  reproducibility?: string;
  autoclavable?: boolean;
  inRegistrySI?: boolean;
  technicalSpecsRanges?: TechnicalSpecsRanges;
}

export interface CreateEquipmentCardData {
  sectionId: string;
  name: string;
  manufacturer?: string;
  series?: string;
  channelsCount?: number;
  dosingVolume?: string;
  volumeStep?: string;
  dosingAccuracy?: string;
  reproducibility?: string;
  autoclavable?: boolean;
  specifications?: Record<string, any>;
  externalUrl?: string;
}

export interface UpdateEquipmentCardData {
  sectionId?: string;
  name?: string;
  manufacturer?: string;
  series?: string;
  channelsCount?: number;
  dosingVolume?: string;
  volumeStep?: string;
  dosingAccuracy?: string;
  reproducibility?: string;
  autoclavable?: boolean;
  specifications?: Record<string, any>;
  externalUrl?: string;
}

