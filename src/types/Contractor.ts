export type ContractorRole = 'supplier' | 'buyer';

export const ContractorRoleLabels: Record<ContractorRole, string> = {
  'supplier': 'Поставщик',
  'buyer': 'Покупатель'
};

export interface Contractor {
  id: string;
  name: string;
  address?: string;
  role?: ContractorRole[];
  tags?: string[];
  latitude?: number;
  longitude?: number;
  geocodedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  contacts: ContractorContact[];
}

export interface ContractorContact {
  id: string;
  contractorId: string;
  employeeName: string;
  phone?: string;
  email?: string;
  // Используется в блоке "Товары и возможные поставщики" для отметки сотрудника
  isSelectedForRequests?: boolean;
  comment?: string;
  createdAt: Date;
}

export interface CreateContractorData {
  name: string;
  address?: string;
  role?: ContractorRole[];
  tags?: string[];
  contacts: Omit<ContractorContact, 'id' | 'contractorId' | 'createdAt'>[];
}

export interface UpdateContractorData {
  name?: string;
  address?: string;
  role?: ContractorRole[];
  tags?: string[];
  latitude?: number;
  longitude?: number;
  geocodedAt?: Date;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}