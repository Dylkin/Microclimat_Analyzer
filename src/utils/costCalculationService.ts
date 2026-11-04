import { apiClient } from './apiClient';
import type { CostCalculation, CostCalculationsResponse, CostCalculationDetails } from '../types/CostCalculation';

interface SaveCostCalculationPayload {
  projectId?: string;
  contractorId: string;
  totalWithVat: number;
  details?: CostCalculationDetails;
}

class CostCalculationService {
  async getCalculations(limit = 200): Promise<CostCalculationsResponse> {
    return apiClient.get<CostCalculationsResponse>(`/cost-calculations?limit=${limit}`);
  }

  async saveCalculation(payload: SaveCostCalculationPayload): Promise<CostCalculation> {
    return apiClient.post<CostCalculation>('/cost-calculations', payload);
  }
}

export const costCalculationService = new CostCalculationService();
