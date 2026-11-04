import React, { useEffect, useState } from 'react';
import { Calculator, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { costCalculationService } from '../utils/costCalculationService';
import type { CostCalculation } from '../types/CostCalculation';

const formatRub = (value: number | null) =>
  value == null
    ? '—'
    : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} руб.`;

const fmtNum = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

// Заголовки групп в детализации расчёта — выделяются жирным
const BOLD_LABELS = new Set([
  'Прямые расходы',
  'Обеспечение ФОТ предприятия',
  'Обеспечение % маркетинга',
  'Плановая прибыль',
  'Премия % от прибыли'
]);

const CostCalculationsPage: React.FC = () => {
  const [items, setItems] = useState<CostCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Скорректированная пользователем плановая прибыль по записям (для пересчёта итога)
  const [profitAdjust, setProfitAdjust] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await costCalculationService.getCalculations();
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить расчёты');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calculator className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Расчёт стоимости квалификации</h1>
            <p className="text-sm text-gray-500 mt-1">
              История выполненных расчётов рекомендуемой стоимости проектов квалификации.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        {loading && items.length === 0 ? (
          <p className="text-sm text-gray-500">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">
            Расчётов пока нет. Они появляются при нажатии кнопки «Рассчитать» на странице «Проекты» при создании
            проекта квалификации.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 w-8"></th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Дата и время расчёта</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Контрагент</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Сотрудник</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Стоимость с НДС</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((item) => {
                  const expanded = expandedId === item.id;
                  const lines = item.details?.lines ?? [];
                  const values = item.details?.values;
                  const baseProfit = values?.planProfit;
                  const adjustedProfit = baseProfit != null ? (profitAdjust[item.id] ?? baseProfit) : null;
                  const recalc =
                    values && adjustedProfit != null
                      ? (() => {
                          const bonus = (adjustedProfit * values.bonusPercent) / 100;
                          const sumWithoutVat =
                            values.directExpenses + values.fotEnterprise + values.marketing + adjustedProfit + bonus;
                          const vat = (sumWithoutVat * values.vatPercent) / 100;
                          return { bonus, sumWithoutVat, vat, total: sumWithoutVat + vat };
                        })()
                      : null;
                  const hasAdjust = values != null && adjustedProfit != null && adjustedProfit !== baseProfit;

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          {lines.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : item.id)}
                              title={expanded ? 'Свернуть детали' : 'Показать детали'}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-800">{formatDateTime(item.createdAt)}</td>
                        <td className="px-3 py-2 text-gray-800">{item.contractorName}</td>
                        <td className="px-3 py-2 text-gray-800">{item.createdByName}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          {formatRub(item.totalWithVat)}
                          {expanded && hasAdjust && recalc && (
                            <span className="block text-xs font-normal text-indigo-700">
                              с корректировкой прибыли: {formatRub(recalc.total)}
                            </span>
                          )}
                        </td>
                      </tr>
                      {expanded && lines.length > 0 && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-3 py-3">
                            <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-1 font-mono text-xs text-gray-700 ml-6">
                              {lines.map((line, idx) => {
                                const key = line.label.trim();
                                const isBold = BOLD_LABELS.has(key);
                                let value = line.value;
                                if (recalc && adjustedProfit != null) {
                                  if (key === 'Премия % от прибыли') {
                                    value = `${fmtNum(adjustedProfit)} × ${fmtNum(values!.bonusPercent)} / 100 = ${fmtNum(recalc.bonus)}`;
                                  } else if (key === 'Сумма без НДС') {
                                    value = `${fmtNum(values!.directExpenses)} + ${fmtNum(values!.fotEnterprise)} + ${fmtNum(values!.marketing)} + ${fmtNum(adjustedProfit)} + ${fmtNum(recalc.bonus)} = ${fmtNum(recalc.sumWithoutVat)}`;
                                  } else if (key === 'Итого с НДС') {
                                    value = `${fmtNum(recalc.sumWithoutVat)} + НДС ${fmtNum(recalc.vat)} = ${fmtNum(recalc.total)}`;
                                  }
                                }
                                const isProfitLine = key === 'Плановая прибыль';
                                return (
                                  <div key={idx} className={isBold ? 'font-semibold text-gray-900' : ''}>
                                    <div className={isProfitLine && values ? 'flex items-center gap-3 flex-wrap' : ''}>
                                      <span>
                                        {line.label}: {value}
                                      </span>
                                      {isProfitLine && values && baseProfit != null && (
                                        <span className="flex items-center gap-2 font-normal">
                                          <input
                                            type="range"
                                            min={0}
                                            max={baseProfit}
                                            step={baseProfit > 100 ? 1 : 0.01}
                                            value={adjustedProfit ?? baseProfit}
                                            onChange={(e) =>
                                              setProfitAdjust((prev) => ({
                                                ...prev,
                                                [item.id]: Number(e.target.value)
                                              }))
                                            }
                                            className="w-48 align-middle"
                                            title="Скорректировать плановую прибыль (0 … рассчитанное значение)"
                                          />
                                          <span className="text-gray-600">{fmtNum(adjustedProfit ?? baseProfit)}</span>
                                          {hasAdjust && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setProfitAdjust((prev) => {
                                                  const next = { ...prev };
                                                  delete next[item.id];
                                                  return next;
                                                })
                                              }
                                              className="text-indigo-600 hover:text-indigo-800 font-sans"
                                              title="Вернуть рассчитанное значение прибыли"
                                            >
                                              Сбросить
                                            </button>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostCalculationsPage;
