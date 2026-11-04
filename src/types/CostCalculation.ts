export interface CostCalculationLine {
  label: string;
  value: string;
}

export interface CostCalculationDetails {
  lines: CostCalculationLine[];
}

export interface CostCalculation {
  id: string;
  projectId: string | null;
  contractorId: string | null;
  contractorName: string;
  totalWithVat: number | null;
  details: CostCalculationDetails | null;
  createdBy: string | null;
  createdByName: string;
  createdAt: string;
}

export interface CostCalculationsResponse {
  items: CostCalculation[];
}
