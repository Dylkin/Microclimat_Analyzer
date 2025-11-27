export interface MailSettings {
  companyName: string;
  defaultUserPhone: string;
}

// Сервис настроек почты. Здесь можно централизованно менять реквизиты для писем.
export const mailSettings: MailSettings = {
  companyName: 'ОДО «Комсистем»',
  // Укажите здесь реальный телефон пользователя или общий телефон компании
  defaultUserPhone: '+375 (__) ___-__-__',
};



