# ⚡ Быстрое развертывание Microclimat Analyzer

> **Краткая инструкция для опытных администраторов**

## 🚀 За 10 минут

### 1. Подготовка (2 мин)

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y curl git nginx

# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Supabase (3 мин)

1. Создайте проект на [supabase.com](https://supabase.com)
2. Выполните SQL из `DEPLOYMENT_GUIDE.md` (раздел "Создание структуры базы данных")
3. Сохраните URL и anon key

### 3. Проект (3 мин)

```bash
cd /var/www
git clone https://github.com/Dylkin/Microclimat_Analyzer.git
cd Microclimat_Analyzer
git checkout podgotovkaprotokola-ok

# Создайте .env
cat > .env << EOF
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=production
EOF

# Установка и сборка
npm install
npm run build
```

### 4. Nginx (2 мин)

```bash
cat > /etc/nginx/sites-available/microclimat << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/Microclimat_Analyzer/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -s /etc/nginx/sites-available/microclimat /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

### 5. SSL (опционально, +2 мин)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## ✅ Готово!

Откройте `http://your-domain.com` или `https://your-domain.com`

---

## 🔄 Обновление проекта

```bash
cd /var/www/Microclimat_Analyzer
git pull origin podgotovkaprotokola-ok
npm install
npm run build
systemctl restart nginx
```

---

## 📋 Минимальные требования

- Ubuntu 20.04+ / Debian 11+
- 2 CPU, 4GB RAM, 20GB Диск
- Node.js 20.x
- Supabase проект

---

## 🆘 Быстрая диагностика

```bash
# Проверка Nginx
systemctl status nginx
nginx -t
tail -f /var/log/nginx/error.log

# Проверка сборки
ls -lh /var/www/Microclimat_Analyzer/dist/

# Проверка доступности
curl -I http://your-domain.com
```

---

## 📚 Полная документация

См. `DEPLOYMENT_GUIDE.md` для подробной информации.


