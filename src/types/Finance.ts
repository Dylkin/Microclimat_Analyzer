import type { FinanceExpenseColumn } from '../utils/financePayrollPlan';

export type FinanceRowKey = `${number}-${'План' | 'Факт'}`;

export type FinanceTableCells = Record<FinanceRowKey, Partial<Record<FinanceExpenseColumn, string>>>;

export interface FinanceExpenseYearData {
  year: number;
  cells: FinanceTableCells | null;
  updatedAt: string | null;
}
