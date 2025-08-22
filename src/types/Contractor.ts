export interface Contractor {
  id: string;
  name: string;
  address?: string;
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
  comment?: string;
  createdAt: Date;
}

export interface CreateContractorData {
  name: string;
  address?: string;
  contacts: Omit<ContractorContact, 'id' | 'contractorId' | 'createdAt'>[];
}

export interface UpdateContractorData {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  geocodedAt?: Date;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}