export interface TaxSettings {
  incomeTax: number;
  belgosstrakh: number;
  fsznEmployer: number;
  fsznEmployee: number;
  vacationPay: number;
  vat: number;
  profitability: number;
}

export const TAX_SETTINGS_STORAGE_KEY = 'microclimat:tax-settings';

/** Событие после сохранения настроек на странице «Налоги» (в той же вкладке storage не срабатывает). */
export const TAX_SETTINGS_CHANGED_EVENT = 'microclimat:tax-settings-changed';

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  incomeTax: 13,
  belgosstrakh: 0.6,
  fsznEmployer: 34,
  fsznEmployee: 1,
  vacationPay: 9.25,
  vat: 20,
  profitability: 10
};

export function loadTaxSettingsFromLocalStorage(): TaxSettings {
  try {
    const raw = localStorage.getItem(TAX_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TAX_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<TaxSettings>;
    return {
      incomeTax: typeof parsed.incomeTax === 'number' ? parsed.incomeTax : DEFAULT_TAX_SETTINGS.incomeTax,
      belgosstrakh: typeof parsed.belgosstrakh === 'number' ? parsed.belgosstrakh : DEFAULT_TAX_SETTINGS.belgosstrakh,
      fsznEmployer: typeof parsed.fsznEmployer === 'number' ? parsed.fsznEmployer : DEFAULT_TAX_SETTINGS.fsznEmployer,
      fsznEmployee: typeof parsed.fsznEmployee === 'number' ? parsed.fsznEmployee : DEFAULT_TAX_SETTINGS.fsznEmployee,
      vacationPay: typeof parsed.vacationPay === 'number' ? parsed.vacationPay : DEFAULT_TAX_SETTINGS.vacationPay,
      vat: typeof parsed.vat === 'number' ? parsed.vat : DEFAULT_TAX_SETTINGS.vat,
      profitability: typeof parsed.profitability === 'number' ? parsed.profitability : DEFAULT_TAX_SETTINGS.profitability
    };
  } catch {
    return { ...DEFAULT_TAX_SETTINGS };
  }
}

/**
 * Коэффициент полной стоимости ФОТ по шаблону: оклад × (1 + Σ ставок),
 * ставки — поля страницы «Налоги» в процентах (как в файле Фот.xlsx: C…H к доле оклада).
 * Поле «ФСЗН сотрудник» в этой сумме не участвует (в шаблоне отдельного столбца нет).
 */
export function payrollFundBurdenMultiplier(settings: TaxSettings): number {
  const sumPct =
    settings.incomeTax +
    settings.belgosstrakh +
    settings.fsznEmployer +
    settings.vacationPay +
    settings.vat +
    settings.profitability;
  return 1 + sumPct / 100;
}
