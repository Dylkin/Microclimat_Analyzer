# Остановка продакшена

## Быстрая остановка

### Остановка PM2 процессов
```bash
pm2 stop all
```

### Полная остановка (удаление из PM2)
```bash
pm2 delete all
```

## Полная остановка всех процессов

### Через SSH из PowerShell (полная остановка)
```powershell
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; pm2 delete all; echo '159357Stas' | sudo -S pm2 -u root delete all 2>/dev/null; echo '159357Stas' | sudo -S killall -9 node tsx 2>/dev/null; echo '159357Stas' | sudo -S fuser -k 3001/tcp 2>/dev/null; echo '159357Stas' | sudo -S systemctl stop nginx"
```

### Пошаговая остановка

#### 1. Остановка PM2 пользователя stas
```bash
pm2 stop all
# или полная остановка
pm2 delete all
```

#### 2. Остановка root PM2 (если запущен)
```bash
sudo pm2 -u root stop all
sudo pm2 -u root delete all
sudo pm2 -u root kill
```

#### 3. Остановка всех процессов node/tsx
```bash
sudo killall -9 node tsx 2>/dev/null
```

#### 4. Освобождение порта 3001
```bash
sudo fuser -k 3001/tcp 2>/dev/null
# или
sudo kill -9 $(sudo lsof -t -i:3001) 2>/dev/null
```

#### 5. Проверка, что все остановлено
```bash
pm2 status
sudo netstat -tulpn | grep :3001
ps aux | grep -E 'node|tsx' | grep -v grep
```

## Остановка через PowerShell (одной командой - полная остановка)

```powershell
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer && pm2 delete all && echo '159357Stas' | sudo -S pm2 -u root delete all 2>/dev/null && echo '159357Stas' | sudo -S pm2 -u root kill 2>/dev/null && echo '159357Stas' | sudo -S killall -9 node tsx 2>/dev/null && echo '159357Stas' | sudo -S fuser -k 3001/tcp 2>/dev/null && echo '159357Stas' | sudo -S systemctl stop nginx && sleep 2 && echo '=== Проверка ===' && pm2 status && echo '159357Stas' | sudo -S netstat -tulpn 2>/dev/null | grep -E ':80|:443|:3001' || echo 'Все порты свободны'"
```

> **Примечание:** Эта команда останавливает и PM2, и Nginx, поэтому фронтенд полностью станет недоступен.

## Остановка Nginx (обязательно для полной остановки фронтенда)

> **Важно:** Nginx отдает статические файлы фронтенда из `/var/www/dist`, поэтому даже после остановки PM2 фронтенд остается доступным через Nginx.

### Остановка Nginx
```bash
sudo systemctl stop nginx
```

### Проверка остановки
```bash
sudo systemctl status nginx
sudo netstat -tulpn | grep -E ':80|:443'
```

## Проверка статуса после остановки

```bash
# Проверка PM2
pm2 status

# Проверка портов 80, 443, 3001
sudo netstat -tulpn | grep -E ':80|:443|:3001'

# Проверка процессов node/tsx
ps aux | grep -E 'node|tsx' | grep -v grep

# Проверка Nginx
sudo systemctl status nginx

# Проверка доступности фронтенда (должен вернуть ошибку)
curl -I http://localhost
```

## Восстановление после остановки

### Запуск через PM2
```bash
cd /home/stas/Microclimat_Analyzer
pm2 start ecosystem.config.cjs
```

### Или запуск вручную
```bash
cd /home/stas/Microclimat_Analyzer
pm2 start npm --name microclimat-api --cwd /home/stas/Microclimat_Analyzer -- run server:prod
```

### Запуск Nginx
```bash
sudo systemctl start nginx
```

## Почему фронтенд остается доступным после `pm2 stop all`?

Nginx работает независимо от PM2 и отдает статические файлы фронтенда из `/var/www/dist`. Даже если PM2 остановлен, Nginx продолжает обслуживать фронтенд через порт 80.

**Для полной остановки фронтенда необходимо:**
1. Остановить PM2: `pm2 stop all` или `pm2 delete all`
2. Остановить Nginx: `sudo systemctl stop nginx`

**Для остановки только бэкенда (API):**
- Достаточно остановить PM2: `pm2 stop all`
- Фронтенд останется доступным, но API запросы не будут работать

