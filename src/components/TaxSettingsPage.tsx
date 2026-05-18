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
        vacationPay: typeof parsed.vacationPay === 'number' ? parsed.vacationPay : DEFAULT_TAX_SETTINGS.vacationPay,
        vat: typeof parsed.vat === 'number' ? parsed.vat : DEFAULT_TAX_SETTINGS.vat,
        profitability: typeof parsed.profitability === 'number' ? parsed.profitability : DEFAULT_TAX_SETTINGS.profitability
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
          <h1 className="text-2xl font-bold text-gray-900">Налоги</h1>
          <p className="text-sm text-gray-500 mt-1">
            Управление налоговыми ставками и рентабельностью в процентах.
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
            <label className="block text-sm font-medium text-gray-700 mb-1">% на отпускные</label>
            <input
              type="number"
              step="0.01"
              value={settings.vacationPay}
              onChange={(e) => handleNumberChange('vacationPay', e.target.value)}
              title="Процент на отпускные"
              placeholder="9.25"
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
        </div>
      </div>
    </div>
  );
};

