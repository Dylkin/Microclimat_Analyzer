# Обновление продакшена

Инструкция по обновлению Microclimat Analyzer на production-сервере по SSH (только по ключу, без пароля).

## Запуск

Из корня проекта в PowerShell:

```powershell
.\update-prod-ready.ps1
```

С указанием хоста и ключа (опционально):

```powershell
.\update-prod-ready.ps1 -SshHost "user@host" -SshKeyPath "$env:USERPROFILE\.ssh\id_rsa"
```

## Требования

- **SSH-ключ** — должен быть добавлен на сервер (например: `ssh-copy-id -i путь_к_ключу user@host`).
- Ключ по умолчанию: `~\.ssh\id_ed25519` или `~\.ssh\id_rsa`.
- Опционально: файл `deploy.env` в корне проекта:
  ```env
  SSH_HOST=stas@192.168.98.42
  SSH_KEY_PATH=%USERPROFILE%\.ssh\id_rsa
  ```

## Что делает скрипт

1. Проверяет наличие SSH-ключа и доступность сервера.
2. Подключается по SSH (только аутентификация по ключу).
3. На сервере находит каталог проекта (`/opt/Microclimat_Analyzer`, `/home/stas/Microclimat_Analyzer` и др.).
4. Запускает `update-prod.sh` (резервная копия, git pull, npm install, setup-db, build, перезапуск PM2).

Скрипт на сервере: `update-prod.sh` (в корне репозитория на сервере).

## Устранение неполадок

- **«SSH key not found»** — положите ключ в `~\.ssh\id_rsa` или `~\.ssh\id_ed25519` или укажите путь в `deploy.env` / параметре `-SshKeyPath`.
- **«Server is not reachable»** — проверьте сеть, VPN, что сервер запущен и порт 22 открыт.
- **«Project directory not found»** — на сервере должен существовать каталог проекта по одному из путей: `/opt/Microclimat_Analyzer`, `/opt/microclimat-analyzer`, `/home/stas/Microclimat_Analyzer`, `/var/www/Microclimat_Analyzer`.

После обновления на сервере можно проверить: `pm2 status`, `curl http://localhost:3001/health`.
