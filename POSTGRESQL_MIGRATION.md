# Миграция с Supabase на PostgreSQL

Этот документ описывает процесс замены Supabase на прямое подключение к PostgreSQL.

## Архитектура

Проект теперь использует:
- **Backend API** (Node.js + Express + PostgreSQL) - сервер на порту 3001
- **Frontend** (React + Vite) - клиент на порту 5173
- **PostgreSQL** - база данных

## Установка зависимостей

```bash
npm install
```

Это установит все необходимые зависимости, включая:
- `express` - веб-сервер
- `pg` - PostgreSQL клиент
- `bcryptjs` - хеширование паролей
- `cors` - CORS middleware
- `dotenv` - переменные окружения
- `tsx` - TypeScript executor

## Настройка базы данных

1. Убедитесь, что PostgreSQL установлен и запущен
2. Создайте базу данных:

```sql
CREATE DATABASE microclimat;
```

3. Выполните SQL скрипты из папки проекта для создания таблиц (используйте существующие SQL файлы)

## Настройка переменных окружения

Создайте файл `server/.env` (или `.env` в корне проекта):

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=microclimat
DB_USER=postgres
DB_PASSWORD=your_password_here

# Server Configuration
PORT=3001

# CORS Configuration (optional)
CORS_ORIGIN=http://localhost:5173
```

## Запуск проекта

### Разработка

1. Запустите backend сервер:
```bash
npm run server
```

2. В другом терминале запустите frontend:
```bash
npm run dev
```

### Production

1. Соберите frontend:
```bash
npm run build
```

2. Запустите backend:
```bash
npm run server:prod
```

## Структура проекта

```
├── server/                 # Backend API
│   ├── index.ts           # Главный файл сервера
│   ├── config/
│   │   └── database.ts    # Конфигурация PostgreSQL
│   └── routes/            # API роуты
│       ├── users.ts
│       ├── projects.ts
│       └── ...
├── src/                    # Frontend
│   └── utils/
│       ├── apiClient.ts   # Новый API клиент
│       ├── userService.pg.ts  # Сервис пользователей (PostgreSQL)
│       └── ...
└── package.json
```

## Миграция сервисов

Для миграции сервисов с Supabase на PostgreSQL API:

1. Импортируйте новый API клиент:
```typescript
import { apiClient } from './apiClient';
```

2. Замените вызовы Supabase на вызовы API:
```typescript
// Было:
const { data, error } = await supabase.from('users').select('*');

// Стало:
const data = await apiClient.get('/users');
```

3. Обновите обработку ошибок (API возвращает JSON с полем `error`)

## API Endpoints

### Users
- `GET /api/users` - получить всех пользователей
- `GET /api/users/:id` - получить пользователя по ID
- `POST /api/users/login` - авторизация
- `POST /api/users` - создать пользователя
- `PUT /api/users/:id` - обновить пользователя
- `DELETE /api/users/:id` - удалить пользователя
- `POST /api/users/:id/reset-password` - сброс пароля

### Projects
- `GET /api/projects` - получить все проекты
- `GET /api/projects/:id` - получить проект по ID
- `POST /api/projects` - создать проект
- `PUT /api/projects/:id` - обновить проект
- `DELETE /api/projects/:id` - удалить проект

## Переключение между Supabase и PostgreSQL

Для переключения между Supabase и PostgreSQL:

1. В `src/utils/userService.ts` замените импорт:
```typescript
// Для PostgreSQL:
import { userService } from './userService.pg';

// Для Supabase (старый):
import { userService } from './userService';
```

2. Убедитесь, что backend сервер запущен для PostgreSQL версии

## Примечания

- Хранение файлов (Storage) требует дополнительной реализации, так как Supabase Storage не используется
- Аутентификация через Supabase Auth заменена на простую проверку паролей (bcrypt)
- RLS (Row Level Security) политики должны быть реализованы на уровне приложения

## Следующие шаги

1. Реализовать полные CRUD операции для всех роутов
2. Добавить аутентификацию через JWT токены
3. Реализовать хранение файлов (локально или через S3)
4. Добавить валидацию данных
5. Реализовать логирование и мониторинг


