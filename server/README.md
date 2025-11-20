# Backend API Server

Backend API сервер для работы с PostgreSQL.

## Быстрый старт

1. Установите зависимости:
```bash
npm install
```

2. Настройте переменные окружения (создайте `.env` файл в корне проекта):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=microclimat
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3001
```

3. Убедитесь, что PostgreSQL запущен и база данных создана

4. Запустите сервер:
```bash
npm run server
```

Сервер будет доступен на `http://localhost:3001`

## API Endpoints

- `GET /health` - проверка здоровья сервера и подключения к БД
- `GET /api/users` - получить всех пользователей
- `POST /api/users/login` - авторизация
- `GET /api/projects` - получить все проекты
- И другие endpoints (см. `server/routes/`)

## Структура

- `server/index.ts` - главный файл сервера
- `server/config/database.ts` - конфигурация PostgreSQL
- `server/routes/` - API роуты


