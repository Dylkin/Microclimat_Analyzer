export interface TechnicalSpecRange {
  enabled: boolean;
  values: string[];
}

export interface TechnicalSpecsRanges {
  [key: string]: TechnicalSpecRange;
}

export interface EquipmentSection {
  id: string;
  name: string;
  description?: string;
  manufacturers?: string[];
  website?: string;
  supplierIds?: string[];
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
  manufacturers?: string[];
  website?: string;
  supplierIds?: string[];
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
  manufacturers?: string[];
  website?: string;
  supplierIds?: string[];
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

