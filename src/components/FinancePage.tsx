import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { staffDirectoryService } from '../utils/staffDirectoryService';
import { financeService } from '../utils/financeService';
import type { FinanceRowKey, FinanceTableCells } from '../types/Finance';
import type { SalaryHistoryEntry, StaffDirectoryData } from '../types/StaffDirectory';
import {
  loadTaxSettingsFromLocalStorage,
  TAX_SETTINGS_CHANGED_EVENT,
  type TaxSettings
} from '../constants/taxSettings';
import {
  applyPayrollBurdenMultiplier,
  computeFinancePlanRowVsego,
  computeMonthlyPayrollSalarySums,
  FINANCE_EXPENSE_COLUMNS
} from '../utils/financePayrollPlan';

const EXPENSE_COLUMNS = FINANCE_EXPENSE_COLUMNS;

const ROWS = [
  { month: 'Январь', type: 'План' },
  { month: '', type: 'Факт' },
  { month: 'Февраль', type: 'План' },
  { month: '', type: 'Факт' },
  { month: 'Март', type: 'План' },
  { month: '', type: 'Факт' },
  { month: 'Апрель', type: 'План' },
  { month: '', type: 'Факт' },
  { month: 'Май', type: 'План' },
  { month: '', type: 'Факт' },
  { month: 'Июнь', type: 'План' },
  { month: '', type: 'Факт' },
  { month: 'Июль', type: 'План' },
  { month: '', type: 'Факт' },
  { month: 'Август', type: 'План' },
  { month: '', type: 'Факт' },
  { month: 'Сентябрь', type: 'План' },
  { month: '', type: 'Факт' },
  { month: 'Октябрь', type: 'План' },
  { month: '', type: 'Факт' },
  { month: 'Ноябрь', type: 'План' },
  { month: '', type: 'Факт' },
  { month: 'Декабрь', type: 'План' },
  { month: '', type: 'Факт' },
  { month: 'Итого', type: 'План' },
  { month: '', type: 'Факт' }
] as const;

type RowKey = FinanceRowKey;
type FinanceState = Record<RowKey, Record<(typeof EXPENSE_COLUMNS)[number], string>>;

const FINANCE_YEAR = new Date().getFullYear();

const createInitialState = (): FinanceState => {
  const state: FinanceState = {} as FinanceState;

  ROWS.forEach((row, index) => {
    const key = `${index}-${row.type}` as RowKey;
    state[key] = {} as Record<(typeof EXPENSE_COLUMNS)[number], string>;
    EXPENSE_COLUMNS.forEach((column) => {
      state[key][column] = '';
    });
  });

  return state;
};

const mergeSavedCells = (saved: FinanceTableCells | null): FinanceState => {
  const state = createInitialState();
  if (!saved) return state;

  for (const rowKey of Object.keys(state) as RowKey[]) {
    const savedRow = saved[rowKey];
    if (!savedRow) continue;
    for (const column of EXPENSE_COLUMNS) {
      const value = savedRow[column];
      if (value != null && value !== '') {
        state[rowKey][column] = String(value);
      }
    }
  }

  return state;
};

/** ФОТ в строках «План» рассчитывается автоматически и не сохраняется в БД. */
const prepareCellsForSave = (data: FinanceState): FinanceTableCells => {
  const cells: FinanceTableCells = {};

  ROWS.forEach((row, index) => {
    const rowKey = `${index}-${row.type}` as RowKey;
    const rowCells: Partial<Record<(typeof EXPENSE_COLUMNS)[number], string>> = {};

    EXPENSE_COLUMNS.forEach((column) => {
      if (column === 'ФОТ' && row.type === 'План') return;
      const value = data[rowKey][column];
      if (value !== '') {
        rowCells[column] = value;
      }
    });

    if (Object.keys(rowCells).length > 0) {
      cells[rowKey] = rowCells;
    }
  });

  return cells;
};

export const FinancePage: React.FC = () => {
  const [tableData, setTableData] = useState<FinanceState>(() => createInitialState());
  const [directoryData, setDirectoryData] = useState<StaffDirectoryData | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryEntry[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(() => loadTaxSettingsFromLocalStorage());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rowKeys = useMemo(() => ROWS.map((row, index) => `${index}-${row.type}` as RowKey), []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [directory, historyResponse, financeData] = await Promise.all([
          staffDirectoryService.getDirectory(),
          staffDirectoryService.getSalaryHistory({ limit: 500 }),
          financeService.getExpenses(FINANCE_YEAR)
        ]);
        if (cancelled) return;
        setDirectoryData(directory);
        setSalaryHistory(historyResponse.items ?? []);
        setTableData(mergeSavedCells(financeData.cells));
      } catch (loadError) {
        console.error('Не удалось загрузить данные для финансовой таблицы:', loadError);
        if (!cancelled) {
          setError('Не удалось загрузить данные таблицы.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const refreshTaxSettings = () => {
      setTaxSettings(loadTaxSettingsFromLocalStorage());
    };

    window.addEventListener(TAX_SETTINGS_CHANGED_EVENT, refreshTaxSettings);
    window.addEventListener('storage', refreshTaxSettings);
    return () => {
      window.removeEventListener(TAX_SETTINGS_CHANGED_EVENT, refreshTaxSettings);
      window.removeEventListener('storage', refreshTaxSettings);
    };
  }, []);

  const monthlyPayrollPlan = useMemo(() => {
    if (!directoryData) return new Array<number>(12).fill(0);
    const sums = computeMonthlyPayrollSalarySums(directoryData, salaryHistory);
    return applyPayrollBurdenMultiplier(sums, taxSettings);
  }, [directoryData, salaryHistory, taxSettings]);

  const formattedMonthlyPayrollPlan = useMemo(
    () => monthlyPayrollPlan.map((value) => (Number.isFinite(value) ? value.toFixed(2) : '0.00')),
    [monthlyPayrollPlan]
  );
  const yearlyPayrollTotal = useMemo(
    () => formattedMonthlyPayrollPlan.reduce((sum, value) => sum + Number(value), 0).toFixed(2),
    [formattedMonthlyPayrollPlan]
  );

  const handleCellChange = (rowKey: RowKey, column: (typeof EXPENSE_COLUMNS)[number], value: string) => {
    setSuccess(null);
    setTableData((prev) => ({
      ...prev,
      [rowKey]: {
        ...prev[rowKey],
        [column]: value
      }
    }));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await financeService.saveExpenses(prepareCellsForSave(tableData), FINANCE_YEAR);
      setSuccess(`Данные за ${FINANCE_YEAR} год сохранены.`);
    } catch (saveError) {
      console.error('Не удалось сохранить финансовую таблицу:', saveError);
      setError('Не удалось сохранить данные. Проверьте подключение к серверу.');
    } finally {
      setSaving(false);
    }
  }, [tableData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Финансы</h1>
          <p className="mt-1 text-sm text-gray-500">Таблица расходов на {FINANCE_YEAR} год.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading || saving}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="mr-1 h-4 w-4" />
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <div
        className={`overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm ${loading ? 'opacity-60' : ''}`}
      >
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Месяц</th>
              <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Тип</th>
              {EXPENSE_COLUMNS.map((column) => (
                <th key={column} className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                  {column}
                </th>
              ))}
              <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Всего</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, index) => {
              const rowKey = rowKeys[index];
              const isFactRow = row.type === 'Факт';

              return (
                <tr key={rowKey} className={isFactRow ? 'bg-gray-50/60' : 'bg-white'}>
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700">{row.month || '-'}</td>
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700">{row.type}</td>
                  {EXPENSE_COLUMNS.map((column) => (
                    <td key={`${rowKey}-${column}`} className="border border-gray-200 p-0">
                      {(() => {
                        const isPayrollPlanCell = column === 'ФОТ' && row.type === 'План';
                        const monthPlanRowIndex = Math.floor(index / 2);
                        const isYearTotalPlanRow = row.month === 'Итого' && row.type === 'План';
                        const autoPayrollValue = isYearTotalPlanRow
                          ? yearlyPayrollTotal
                          : formattedMonthlyPayrollPlan[monthPlanRowIndex];
                        const displayValue =
                          isPayrollPlanCell && typeof autoPayrollValue === 'string'
                            ? autoPayrollValue
                            : tableData[rowKey][column];

                        return (
                      <input
                        type="number"
                        step="0.01"
                        value={displayValue}
                        onChange={(event) => handleCellChange(rowKey, column, event.target.value)}
                        readOnly={isPayrollPlanCell || loading}
                        disabled={loading}
                        className={`w-full border-0 px-3 py-2 text-sm text-gray-900 outline-none ${
                          isPayrollPlanCell ? 'bg-gray-100 font-medium' : 'bg-transparent focus:bg-indigo-50'
                        }`}
                        placeholder="0"
                        title={`${row.month || 'Строка'} ${row.type} - ${column}`}
                      />
                        );
                      })()}
                    </td>
                  ))}
                  <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-900 bg-gray-50 text-right">
                    {computeFinancePlanRowVsego({
                      rowIndexInTable: index,
                      rowMonth: row.month,
                      rowType: row.type,
                      columnValues: tableData[rowKey],
                      formattedMonthlyPayrollPlan,
                      yearlyPayrollTotal
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
