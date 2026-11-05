// Матрица доступа к страницам приложения по ролям пользователя.
// Роли: Администратор (admin/administrator), Менеджер (manager), Специалист (specialist).
// Роль «Руководитель» (director) удалена из проекта.

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
  | 'cost-calculations'
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

type AccessRole = 'specialist' | 'manager';

const ALL_ROLES: AccessRole[] = ['specialist', 'manager'];

const PAGE_ROLES: Record<PageKey, AccessRole[]> = {
  // Матрица доступа:
  //                        Администратор  Менеджер    Специалист
  // Пользователи           +              —           —
  // Структура предприятия  +              —           —
  // Контрагенты            +              +           +
  // Проекты                +              +           +
  // Оборудование           +              —           +
  // Товары                 +              +           —
  // Объекты квалификации   +              +           +
  // Справка                +              +           +
  // Сервис (все страницы)  +              —           —
  users: [],                    // только администратор
  'staff-directory': [],        // только администратор
  contractors: ALL_ROLES,
  projects: ALL_ROLES,
  equipment: ['specialist'],
  products: ['manager'],
  'qualification-objects': ALL_ROLES,
  help: ALL_ROLES,
  service: [],                  // только администратор
  analyzer: [],
  audit_logs: [],               // только администратор
  'cost-calculations': [],
  'mail-settings': [],
  'tax-settings': [],
  finance: [],
  release: [],
  'tender-search': [],
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
// Устаревшая роль 'director' доступа не имеет (роль удалена из проекта).
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
