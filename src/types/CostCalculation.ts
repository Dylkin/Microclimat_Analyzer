export interface CostCalculationLine {
  label: string;
  value: string;
}

/** Числовые значения расчёта — нужны для пересчёта итога при корректировке плановой прибыли */
export interface CostCalculationValues {
  directExpenses: number;
  fotEnterprise: number;
  marketing: number;
  planProfit: number;
  bonusPercent: number;
  vatPercent: number;
}

export interface CostCalculationDetails {
  lines: CostCalculationLine[];
  values?: CostCalculationValues;
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
