// Матрица доступа к страницам приложения по ролям пользователя.
// Роли: Специалист (specialist), Менеджер (manager), Руководитель (director), Администратор (admin/administrator).

export type PageKey =
  | 'users'                 // Пользователи
  | 'staff-directory'       // Структура предприятия
  | 'contractors'           // Контрагенты
  | 'projects'              // Проекты
  | 'equipment'             // Оборудование
  | 'products'              // Товары
  | 'qualification-objects' // Объекты квалификации
  | 'help'                  // Справка
  | 'service'               // Сервис (родительский пункт меню)
  // Пункты подменю «Сервис»
  | 'analyzer'
  | 'audit_logs'
  | 'mail-settings'
  | 'tax-settings'
  | 'finance'
  | 'release'
  | 'tender-search'
  // Рабочие страницы проекта (доступ как у страницы «Проекты»)
  | 'contract_negotiation'
  | 'testing_execution'
  | 'creating_report'
  | 'documents_submission'
  | 'not_suitable'
  | 'data_analysis'
  | 'logger_plan_editor';

type AccessRole = 'specialist' | 'manager' | 'director';

const ALL_ROLES: AccessRole[] = ['specialist', 'manager', 'director'];

const PAGE_ROLES: Record<PageKey, AccessRole[]> = {
  // Специалист: Контрагенты, Проекты, Оборудование, Объекты квалификации, Справка
  // Менеджер: Контрагенты, Проекты, Товары, Объекты квалификации, Справка
  // Руководитель: Пользователи, Структура предприятия, Контрагенты, Проекты, Оборудование,
  //               Товары, Объекты квалификации, Справка, Сервис
  users: ['director'],
  'staff-directory': ['director'],
  contractors: ALL_ROLES,
  projects: ALL_ROLES,
  equipment: ['director', 'specialist'],
  products: ['director', 'manager'],
  'qualification-objects': ALL_ROLES,
  help: ALL_ROLES,
  service: ['director'],
  analyzer: ['director'],
  audit_logs: [], // только администратор
  'mail-settings': ['director'],
  'tax-settings': ['director'],
  finance: ['director'],
  release: ['director'],
  'tender-search': ['director'],
  contract_negotiation: ALL_ROLES,
  testing_execution: ALL_ROLES,
  creating_report: ALL_ROLES,
  documents_submission: ALL_ROLES,
  not_suitable: ALL_ROLES,
  data_analysis: ALL_ROLES,
  logger_plan_editor: ALL_ROLES,
};

// Проверяет доступ роли к странице.
// Страницы вне матрицы (например, 'profile') не ограничиваются.
export const canAccessPage = (role: string | null | undefined, page: string): boolean => {
  const normalized = (role || '').toLowerCase();
  if (normalized === 'admin' || normalized === 'administrator') return true;

  const allowed = PAGE_ROLES[page as PageKey];
  if (!allowed) return true; // страница не ограничена матрицей
  return allowed.includes(normalized as AccessRole);
};

// Первая доступная страница для роли (для редиректа при отказе в доступе)
export const getDefaultPage = (role: string | null | undefined): string =>
  canAccessPage(role, 'projects') ? 'projects' : 'profile';
