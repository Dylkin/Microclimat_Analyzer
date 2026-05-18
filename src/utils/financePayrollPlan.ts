import type { SalaryHistoryEntry, StaffDirectoryData } from '../types/StaffDirectory';
import type { TaxSettings } from '../constants/taxSettings';
import { payrollFundBurdenMultiplier } from '../constants/taxSettings';

/**
 * Суммы окладов по месяцам (до коэффициента ФОТ из налоговых настроек), как на странице «Финансы».
 * Если задан departmentId — только должности этого отдела; иначе по всей организации.
 */
export function computeMonthlyPayrollSalarySums(
  directoryData: StaffDirectoryData,
  salaryHistory: SalaryHistoryEntry[],
  options?: { departmentId?: string | null }
): number[] {
  const values = new Array<number>(12).fill(0);

  const monthEndDates = Array.from({ length: 12 }, (_, monthIndex) => {
    const year = new Date().getFullYear();
    return new Date(year, monthIndex + 1, 0);
  });

  const historyByPosition = new Map<string, SalaryHistoryEntry[]>();
  for (const entry of salaryHistory) {
    const bucket = historyByPosition.get(entry.positionId) ?? [];
    bucket.push(entry);
    historyByPosition.set(entry.positionId, bucket);
  }
  historyByPosition.forEach((entries) => {
    entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });

  const filterDept = options?.departmentId;

  for (const department of directoryData.departments) {
    if (filterDept && department.id !== filterDept) continue;
    for (const position of department.positions) {
      const currentEffectiveFrom = new Date(position.salaryEffectiveFrom);
      currentEffectiveFrom.setHours(0, 0, 0, 0);
      const positionHistory = historyByPosition.get(position.id) ?? [];

      monthEndDates.forEach((monthEnd, monthIndex) => {
        const monthEndTs = monthEnd.getTime();
        let salaryForMonth = monthEndTs >= currentEffectiveFrom.getTime() ? position.salary : 0;

        if (monthEndTs < currentEffectiveFrom.getTime()) {
          for (const item of positionHistory) {
            const changedAt = new Date(item.createdAt).getTime();
            if (changedAt <= monthEndTs) {
              salaryForMonth = item.newSalary;
            } else {
              break;
            }
          }
        }

        values[monthIndex] += salaryForMonth;
      });
    }
  }

  return values;
}

export function applyPayrollBurdenMultiplier(values: number[], taxSettings: TaxSettings): number[] {
  const multiplier = payrollFundBurdenMultiplier(taxSettings);
  return values.map((salarySum) => salarySum * multiplier);
}

/** Колонки расходов — в том же порядке, что на странице «Финансы». */
export const FINANCE_EXPENSE_COLUMNS = [
  'Аренда',
  'Уборка',
  'Обслуживание транспорта',
  'Услуги банка',
  'Интернет/связь',
  'Оплата хостинга',
  'Реклама',
  'ФОТ',
  'Прочие'
] as const;

export type FinanceExpenseColumn = (typeof FINANCE_EXPENSE_COLUMNS)[number];

export function toFinanceNumericCell(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Значение колонки «Всего» для строки таблицы «Финансы» (как сумма по статьям с автоподстановкой ФОТ в плане).
 */
export function computeFinancePlanRowVsego(options: {
  rowIndexInTable: number;
  rowMonth: string;
  rowType: 'План' | 'Факт';
  columnValues: Partial<Record<FinanceExpenseColumn, string>>;
  formattedMonthlyPayrollPlan: string[];
  yearlyPayrollTotal: string;
}): string {
  const {
    rowIndexInTable,
    rowMonth,
    rowType,
    columnValues,
    formattedMonthlyPayrollPlan,
    yearlyPayrollTotal
  } = options;

  return FINANCE_EXPENSE_COLUMNS.reduce((sum, column) => {
    const isPayrollPlanCell = column === 'ФОТ' && rowType === 'План';
    const monthPlanRowIndex = Math.floor(rowIndexInTable / 2);
    const isYearTotalPlanRow = rowMonth === 'Итого' && rowType === 'План';
    const autoPayrollValue = isYearTotalPlanRow
      ? yearlyPayrollTotal
      : formattedMonthlyPayrollPlan[monthPlanRowIndex];
    const displayValue =
      isPayrollPlanCell && typeof autoPayrollValue === 'string'
        ? autoPayrollValue
        : (columnValues[column] ?? '');
    return sum + toFinanceNumericCell(displayValue);
  }, 0).toFixed(2);
}
