import React, { useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import {
  DEFAULT_TAX_SETTINGS,
  type TaxSettings,
  TAX_SETTINGS_CHANGED_EVENT,
  TAX_SETTINGS_STORAGE_KEY
} from '../constants/taxSettings';

const normalizeNumber = (value: string): number => {
  const normalized = value.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const TaxSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TAX_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<TaxSettings>;

      setSettings({
        incomeTax: typeof parsed.incomeTax === 'number' ? parsed.incomeTax : DEFAULT_TAX_SETTINGS.incomeTax,
        belgosstrakh: typeof parsed.belgosstrakh === 'number' ? parsed.belgosstrakh : DEFAULT_TAX_SETTINGS.belgosstrakh,
        fsznEmployer: typeof parsed.fsznEmployer === 'number' ? parsed.fsznEmployer : DEFAULT_TAX_SETTINGS.fsznEmployer,
        fsznEmployee: typeof parsed.fsznEmployee === 'number' ? parsed.fsznEmployee : DEFAULT_TAX_SETTINGS.fsznEmployee,
        vat: typeof parsed.vat === 'number' ? parsed.vat : DEFAULT_TAX_SETTINGS.vat,
        profitability: typeof parsed.profitability === 'number' ? parsed.profitability : DEFAULT_TAX_SETTINGS.profitability,
        loggerDayCost: typeof parsed.loggerDayCost === 'number' ? parsed.loggerDayCost : DEFAULT_TAX_SETTINGS.loggerDayCost,
        protocolPrintCost: typeof parsed.protocolPrintCost === 'number' ? parsed.protocolPrintCost : DEFAULT_TAX_SETTINGS.protocolPrintCost,
        reportPrintCost: typeof parsed.reportPrintCost === 'number' ? parsed.reportPrintCost : DEFAULT_TAX_SETTINGS.reportPrintCost,
        monthlyOverheadCosts: typeof parsed.monthlyOverheadCosts === 'number' ? parsed.monthlyOverheadCosts : DEFAULT_TAX_SETTINGS.monthlyOverheadCosts,
        monthlyMarketingCosts: typeof parsed.monthlyMarketingCosts === 'number' ? parsed.monthlyMarketingCosts : DEFAULT_TAX_SETTINGS.monthlyMarketingCosts,
        projectBonusPercent: typeof parsed.projectBonusPercent === 'number' ? parsed.projectBonusPercent : DEFAULT_TAX_SETTINGS.projectBonusPercent,
        validationRevenueShare: typeof parsed.validationRevenueShare === 'number' ? parsed.validationRevenueShare : DEFAULT_TAX_SETTINGS.validationRevenueShare,
        unexpectedExpensesPercent: typeof parsed.unexpectedExpensesPercent === 'number' ? parsed.unexpectedExpensesPercent : DEFAULT_TAX_SETTINGS.unexpectedExpensesPercent
      });
    } catch (loadError) {
      console.error('Ошибка загрузки налоговых настроек:', loadError);
      setError('Не удалось загрузить налоговые настройки.');
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(TAX_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new Event(TAX_SETTINGS_CHANGED_EVENT));
      setSuccess('Налоговые параметры сохранены.');
      setError(null);
    } catch (saveError) {
      console.error('Ошибка сохранения налоговых настроек:', saveError);
      setError('Не удалось сохранить налоговые настройки.');
      setSuccess(null);
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_TAX_SETTINGS);
    setSuccess(null);
    setError(null);
  };

  const handleNumberChange = (field: keyof TaxSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: normalizeNumber(value)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Переменные</h1>
          <p className="text-sm text-gray-500 mt-1">
            Управление налоговыми ставками, рентабельностью в процентах и переменными для расчётов.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="inline-flex items-center px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Сбросить
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Save className="w-4 h-4 mr-1" />
            Сохранить
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Подоходный налог, %</label>
            <input
              type="number"
              step="0.1"
              value={settings.incomeTax}
              onChange={(e) => handleNumberChange('incomeTax', e.target.value)}
              title="Подоходный налог в процентах"
              placeholder="13"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Белгосстрах, %</label>
            <input
              type="number"
              step="0.1"
              value={settings.belgosstrakh}
              onChange={(e) => handleNumberChange('belgosstrakh', e.target.value)}
              title="Белгосстрах в процентах"
              placeholder="0.6"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ФСЗН работодатель, %</label>
            <input
              type="number"
              step="0.1"
              value={settings.fsznEmployer}
              onChange={(e) => handleNumberChange('fsznEmployer', e.target.value)}
              title="ФСЗН работодателя в процентах"
              placeholder="34"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ФСЗН сотрудник, %</label>
            <input
              type="number"
              step="0.1"
              value={settings.fsznEmployee}
              onChange={(e) => handleNumberChange('fsznEmployee', e.target.value)}
              title="ФСЗН сотрудника в процентах"
              placeholder="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">НДС, %</label>
            <input
              type="number"
              step="0.1"
              value={settings.vat}
              onChange={(e) => handleNumberChange('vat', e.target.value)}
              title="НДС в процентах"
              placeholder="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Рентабельность, %</label>
            <input
              type="number"
              step="0.1"
              value={settings.profitability}
              onChange={(e) => handleNumberChange('profitability', e.target.value)}
              title="Рентабельность в процентах"
              placeholder="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Стоимость использования логгера в день, руб. без НДС</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.loggerDayCost}
              onChange={(e) => handleNumberChange('loggerDayCost', e.target.value)}
              title="Стоимость использования логгера в день, руб. без НДС"
              placeholder="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Средняя стоимость печати протокола, руб. без НДС</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.protocolPrintCost}
              onChange={(e) => handleNumberChange('protocolPrintCost', e.target.value)}
              title="Средняя стоимость печати протокола, руб. без НДС"
              placeholder="30"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Средняя стоимость печати отчёта, руб. без НДС</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.reportPrintCost}
              onChange={(e) => handleNumberChange('reportPrintCost', e.target.value)}
              title="Средняя стоимость печати отчёта, руб. без НДС"
              placeholder="70"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Накладные расходы без НДС (мес.)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.monthlyOverheadCosts}
              onChange={(e) => handleNumberChange('monthlyOverheadCosts', e.target.value)}
              title="Накладные расходы без НДС в месяц, руб."
              placeholder="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Расходы на маркетинг без НДС (мес.)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.monthlyMarketingCosts}
              onChange={(e) => handleNumberChange('monthlyMarketingCosts', e.target.value)}
              title="Расходы на маркетинг без НДС в месяц, руб."
              placeholder="800"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Премия % от прибыли</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={settings.projectBonusPercent}
              onChange={(e) => handleNumberChange('projectBonusPercent', e.target.value)}
              title="Премия в процентах от плановой прибыли, %"
              placeholder="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">% отдела Валидации в общих доходах</label>
            <input
              type="number"
              step="0.1"
              value={settings.validationRevenueShare}
              onChange={(e) => handleNumberChange('validationRevenueShare', e.target.value)}
              title="Доля отдела Валидации в общих доходах, %"
              placeholder="45"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Непредвиденные расходы, %</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={settings.unexpectedExpensesPercent}
              onChange={(e) => handleNumberChange('unexpectedExpensesPercent', e.target.value)}
              title="Непредвиденные расходы в процентах от суммы (печать протоколов и отчётов + командировочные + транспортные), %"
              placeholder="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Формула расчёта рекомендуемой стоимости проекта</h2>
        <p className="text-sm text-gray-600 mb-2">
          На форме создания проекта под блоком «План проведения работ» выводится рекомендуемая стоимость (руб. с НДС),
          вычисляемая по формуле:
        </p>
        <div className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-4 leading-relaxed space-y-2">
          <div>
            <span className="font-semibold">Прямые расходы</span> = Кол-во логгеров для проведения испытаний × Стоимость
            использования логгера в день, руб. без НДС × кол-во календарных дней в периоде «Проведение испытаний»
            + Кол-во печатных экземпляров протоколов × Средняя стоимость печати протокола, руб. без НДС
            + Кол-во печатных экземпляров отчётов × Средняя стоимость печати отчёта, руб. без НДС
            + Командировочные расходы + Транспортные расходы
          </div>
          <div>
            <span className="font-semibold">Обеспечение ФОТ предприятия</span> = Обеспечение ФОТ Отдела валидации: ФОТ
            Отдела валидации / 20,6 × кол-во дней подготовки протоколов и отчётов
            + Обеспечение % ФОТ Администрации: ФОТ Администрации / 20,6 × (% отдела Валидации в общих доходах / 100) ×
            кол-во дней подготовки протоколов и отчётов
            + Обеспечение % ФОТ Отдела продаж: ФОТ Отдела продаж / 20,6 × (% отдела Валидации в общих доходах / 100) ×
            кол-во дней подготовки протоколов и отчётов
          </div>
          <div>
            <span className="font-semibold">Обеспечение % маркетинга</span> = Расходы на маркетинг без НДС (мес.) / 20,6 ×
            (% отдела Валидации в общих доходах / 100) × кол-во дней подготовки протоколов и отчётов
          </div>
          <div>
            <span className="font-semibold">Плановая прибыль</span> = (Обеспечение ФОТ предприятия + Обеспечение %
            маркетинга) × Рентабельность / 100
          </div>
          <div>
            <span className="font-semibold">Премия</span> = Плановая прибыль × Премия % от прибыли / 100
          </div>
          <div>
            <span className="font-semibold">Непредвиденные расходы</span> = (Кол-во печатных экземпляров протоколов ×
            Средняя стоимость печати протокола, руб. без НДС + Кол-во печатных экземпляров отчётов × Средняя стоимость
            печати отчёта, руб. без НДС + Командировочные расходы + Транспортные расходы) × Непредвиденные расходы / 100
          </div>
          <div>
            <span className="font-semibold">Сумма без НДС</span> = Прямые расходы + Обеспечение ФОТ предприятия + Обеспечение
            % маркетинга + Плановая прибыль + Премия + Непредвиденные расходы
          </div>
          <div>
            <span className="font-semibold">Итого с НДС</span> = Сумма без НДС + НДС, где НДС = Сумма без НДС × НДС / 100
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          ФОТ отделов берётся со страницы «Структура предприятия» (Σ оклад должности × количество сотрудников по
          должности, задаётся вручную, с коэффициентом нагрузки).
          Кол-во дней подготовки документации = значение переменной «Кол-во дней на подготовку документации»
          (задаётся на странице «Проекты» при добавлении проекта, по умолчанию 5). Деление на 20,6 — среднее количество рабочих дней в месяце (месячный ФОТ и
          месячные расходы переводятся в дневную ставку). Ставки (рентабельность, премия % от прибыли, НДС и др.) — со
          страницы «Переменные». Если отдел с нужным названием не найден, его ФОТ в расчёте принимается равным нулю.
        </p>
      </div>
    </div>
  );
};

