import { apiClient } from './apiClient';
import type { FinanceExpenseYearData, FinanceTableCells } from '../types/Finance';

class FinanceService {
  async getExpenses(year?: number): Promise<FinanceExpenseYearData> {
    const query = year != null ? `?year=${year}` : '';
    return apiClient.get<FinanceExpenseYearData>(`/finance/expenses${query}`);
  }

  async saveExpenses(cells: FinanceTableCells, year?: number): Promise<FinanceExpenseYearData> {
    return apiClient.put<FinanceExpenseYearData>('/finance/expenses', { year, cells });
  }
}

export const financeService = new FinanceService();
