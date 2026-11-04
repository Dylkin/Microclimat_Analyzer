import React, { useEffect, useState } from 'react';
import { Calculator, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { costCalculationService } from '../utils/costCalculationService';
import type { CostCalculation } from '../types/CostCalculation';

const formatRub = (value: number | null) =>
  value == null
    ? '—'
    : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} руб.`;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

const CostCalculationsPage: React.FC = () => {
  const [items, setItems] = useState<CostCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
            Расчётов пока нет. Они появляются при создании проекта квалификации с заполненными данными для расчёта
            стоимости.
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
                        <td className="px-3 py-2 text-right font-medium text-gray-900">{formatRub(item.totalWithVat)}</td>
                      </tr>
                      {expanded && lines.length > 0 && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-3 py-3">
                            <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-1 font-mono text-xs text-gray-700 ml-6">
                              {lines.map((line, idx) => (
                                <div key={idx}>
                                  {line.label}: {line.value}
                                </div>
                              ))}
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
