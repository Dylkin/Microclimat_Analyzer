export interface TaxSettings {
  incomeTax: number;
  belgosstrakh: number;
  fsznEmployer: number;
  fsznEmployee: number;
  vacationPay: number;
  vat: number;
  profitability: number;
  loggerDayCost: number;
  protocolPrintCost: number;
  reportPrintCost: number;
  monthlyOverheadCosts: number;
  monthlyMarketingCosts: number;
  projectBonusPercent: number;
  validationRevenueShare: number;
}

export const TAX_SETTINGS_STORAGE_KEY = 'microclimat:tax-settings';

/** Событие после сохранения настроек на странице «Переменные» (в той же вкладке storage не срабатывает). */
export const TAX_SETTINGS_CHANGED_EVENT = 'microclimat:tax-settings-changed';

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  incomeTax: 13,
  belgosstrakh: 0.6,
  fsznEmployer: 34,
  fsznEmployee: 1,
  vacationPay: 9.25,
  vat: 20,
  profitability: 10,
  loggerDayCost: 3,
  protocolPrintCost: 30,
  reportPrintCost: 70,
  monthlyOverheadCosts: 1000,
  monthlyMarketingCosts: 800,
  projectBonusPercent: 10,
  validationRevenueShare: 45
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
      profitability: typeof parsed.profitability === 'number' ? parsed.profitability : DEFAULT_TAX_SETTINGS.profitability,
      loggerDayCost: typeof parsed.loggerDayCost === 'number' ? parsed.loggerDayCost : DEFAULT_TAX_SETTINGS.loggerDayCost,
      protocolPrintCost: typeof parsed.protocolPrintCost === 'number' ? parsed.protocolPrintCost : DEFAULT_TAX_SETTINGS.protocolPrintCost,
      reportPrintCost: typeof parsed.reportPrintCost === 'number' ? parsed.reportPrintCost : DEFAULT_TAX_SETTINGS.reportPrintCost,
      monthlyOverheadCosts: typeof parsed.monthlyOverheadCosts === 'number' ? parsed.monthlyOverheadCosts : DEFAULT_TAX_SETTINGS.monthlyOverheadCosts,
      monthlyMarketingCosts: typeof parsed.monthlyMarketingCosts === 'number' ? parsed.monthlyMarketingCosts : DEFAULT_TAX_SETTINGS.monthlyMarketingCosts,
      projectBonusPercent: typeof parsed.projectBonusPercent === 'number' ? parsed.projectBonusPercent : DEFAULT_TAX_SETTINGS.projectBonusPercent,
      validationRevenueShare: typeof parsed.validationRevenueShare === 'number' ? parsed.validationRevenueShare : DEFAULT_TAX_SETTINGS.validationRevenueShare
    };
  } catch {
    return { ...DEFAULT_TAX_SETTINGS };
  }
}

/**
 * Коэффициент полной стоимости ФОТ: оклад × (1 + Σ ставок),
 * ставки — подоходный + белгосстрах + ФСЗН работодателя + % на отпускные (поля страницы «Переменные»).
 * НДС и рентабельность в расчёт ФОТ не входят.
 * Поле «ФСЗН сотрудник» в этой сумме не участвует.
 */
export function payrollFundBurdenMultiplier(settings: TaxSettings): number {
  const sumPct =
    settings.incomeTax +
    settings.belgosstrakh +
    settings.fsznEmployer +
    settings.vacationPay;
  return 1 + sumPct / 100;
}
