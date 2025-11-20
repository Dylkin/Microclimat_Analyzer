export interface TenderSearchSettings {
  id?: string;
  userId?: string;
  purchaseItems: string[]; // Перечень предметов закупки
  organizationUnps: string[]; // Список УНП организаций закупки
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Tender {
  id?: string;
  searchSettingsId?: string;
  tenderNumber: string; // Номер тендера
  title: string; // Название тендера
  organizationName: string; // Название организации
  organizationUnp: string; // УНП организации
  purchaseItem?: string; // Предмет закупки
  publicationDate: Date; // Дата публикации
  deadlineDate?: Date; // Срок подачи предложений
  tenderUrl: string; // Ссылка на тендер
  status?: string; // Статус тендера
  parsedAt: Date; // Дата парсинга
}

export interface TenderSearchHistory {
  id?: string;
  userId?: string;
  searchSettings: TenderSearchSettings; // Настройки поиска
  searchDate: Date; // Дата поиска
  foundTendersCount: number; // Количество найденных тендеров
  parsingStatus: 'success' | 'error' | 'in_progress'; // Статус парсинга
  errorMessage?: string; // Сообщение об ошибке
  tenders?: Tender[]; // Найденные тендеры
}

