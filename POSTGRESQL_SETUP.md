# Установка и настройка PostgreSQL

## Проверка статуса

Скрипт проверки показал, что PostgreSQL сервер не запущен или недоступен.

## Вариант 1: PostgreSQL уже установлен

Если PostgreSQL уже установлен, но не запущен:

### Windows (через службы)
1. Откройте "Службы" (Services):
   - Нажмите `Win + R`, введите `services.msc` и нажмите Enter
2. Найдите службу PostgreSQL:
   - Ищите "postgresql" или "PostgreSQL"
3. Запустите службу:
   - Правый клик → "Запустить" (Start)

### Windows (через командную строку)
```powershell
# Запуск службы PostgreSQL (замените на имя вашей службы)
Start-Service postgresql-x64-14
# или
net start postgresql-x64-14
```

### Проверка через командную строку
```powershell
# Проверка статуса службы
Get-Service -Name "*postgresql*"
```

## Вариант 2: Установка PostgreSQL

Если PostgreSQL не установлен:

### Windows
1. Скачайте установщик с официального сайта:
   https://www.postgresql.org/download/windows/

2. Запустите установщик и следуйте инструкциям:
   - Выберите компоненты (обычно все)
   - Укажите пароль для пользователя `postgres` (запомните его!)
   - Порт по умолчанию: `5432`
   - Локаль: можно оставить по умолчанию

3. После установки PostgreSQL должен автоматически запуститься

### Альтернативные варианты установки

#### Через Chocolatey
```powershell
choco install postgresql
```

#### Через Docker
```bash
docker run --name postgres-microclimat -e POSTGRES_PASSWORD=your_password -e POSTGRES_DB=microclimat -p 5432:5432 -d postgres:latest
```

## Настройка подключения

1. Создайте файл `.env` в корне проекта (скопируйте из `.env.example`):
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=microclimat
   DB_USER=postgres
   DB_PASSWORD=ваш_пароль_здесь
   PORT=3001
   VITE_API_URL=http://localhost:3001/api
   ```

2. Замените `DB_PASSWORD` на пароль, который вы указали при установке PostgreSQL

## Создание базы данных

После того, как PostgreSQL запущен, выполните:

```bash
# Через psql (если доступен)
psql -U postgres
CREATE DATABASE microclimat;

# Или через скрипт проверки (создаст базу автоматически)
npx tsx server/scripts/check-database.ts
```

## Проверка подключения

После настройки выполните проверку:

```bash
npx tsx server/scripts/check-database.ts
```

Скрипт должен показать:
- ✅ PostgreSQL подключен успешно
- ✅ База данных "microclimat" существует
- Список таблиц (если они уже созданы)

## Создание таблиц

После создания базы данных выполните SQL скрипты из проекта для создания таблиц:
- `database_setup.sql`
- Другие SQL файлы в корне проекта

## Проблемы и решения

### Ошибка: "PostgreSQL сервер не запущен"
- Проверьте, запущена ли служба PostgreSQL
- Проверьте, не заблокирован ли порт 5432 файрволом

### Ошибка: "Неверные учетные данные"
- Проверьте пароль в файле `.env`
- Убедитесь, что пользователь `postgres` существует

### Ошибка: "База данных не существует"
- Скрипт проверки создаст базу автоматически
- Или создайте вручную: `CREATE DATABASE microclimat;`

### Порт 5432 занят
- Проверьте, не запущен ли другой экземпляр PostgreSQL
- Измените порт в `.env` и в настройках PostgreSQL


