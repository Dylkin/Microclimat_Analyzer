#!/usr/bin/env bash

# Скрипт для настройки HTTPS с самоподписанным сертификатом
# Для внутренней сети (192.168.98.42)

set -e

print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    print_error "Пожалуйста, запустите скрипт с правами root (sudo)"
    exit 1
fi

# IP адрес сервера
SERVER_IP="192.168.98.42"
DOMAIN_NAME="${SERVER_IP}"

print_info "Настройка HTTPS с самоподписанным сертификатом для ${DOMAIN_NAME}"

# Создание директории для сертификатов
CERT_DIR="/etc/nginx/ssl"
mkdir -p "$CERT_DIR"

# Генерация самоподписанного сертификата
print_info "Генерация самоподписанного SSL сертификата..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR/microclimat.key" \
    -out "$CERT_DIR/microclimat.crt" \
    -subj "/C=RU/ST=State/L=City/O=Organization/CN=${DOMAIN_NAME}" \
    -addext "subjectAltName=IP:${SERVER_IP},DNS:${DOMAIN_NAME}"

chmod 600 "$CERT_DIR/microclimat.key"
chmod 644 "$CERT_DIR/microclimat.crt"

print_success "SSL сертификат создан"

# Резервная копия текущей конфигурации
NGINX_CONF="/etc/nginx/sites-available/microclimat-analyzer"
if [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    print_info "Создана резервная копия конфигурации"
fi

# Обновление конфигурации Nginx для HTTPS
print_info "Обновление конфигурации Nginx..."

cat > "$NGINX_CONF" <<EOF
# Редирект HTTP на HTTPS
server {
    listen 80;
    server_name ${DOMAIN_NAME};
    
    # Редирект всех запросов на HTTPS
    return 301 https://\$server_name\$request_uri;
}

# HTTPS сервер
server {
    listen 443 ssl http2;
    server_name ${DOMAIN_NAME};

    # SSL сертификаты
    ssl_certificate /etc/nginx/ssl/microclimat.crt;
    ssl_certificate_key /etc/nginx/ssl/microclimat.key;

    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Лимит размера загружаемых файлов
    client_max_body_size 200M;

    # Корневая директория для статических файлов
    root /opt/Microclimat_Analyzer/dist;
    index index.html;

    # Логи
    access_log /var/log/nginx/microclimat-access.log;
    error_log /var/log/nginx/microclimat-error.log;

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Статические файлы
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Кэширование статических ресурсов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Проксирование API запросов
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # ВАЖНО: Передача заголовков для авторизации
        proxy_pass_request_headers on;
        proxy_set_header X-User-Id \$http_x_user_id;
        proxy_set_header x-user-id \$http_x_user_id;
        proxy_set_header x-userid \$http_x_userid;
        
        proxy_cache_bypass \$http_upgrade;
    }

    # Проксирование загрузок
    location /uploads {
        alias /opt/Microclimat_Analyzer/uploads;
        expires 1d;
        add_header Cache-Control "public";
    }

    # Запрет доступа к скрытым файлам
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Проверка конфигурации
print_info "Проверка конфигурации Nginx..."
if nginx -t; then
    print_success "Конфигурация Nginx корректна"
else
    print_error "Ошибка в конфигурации Nginx"
    exit 1
fi

# Перезагрузка Nginx
print_info "Перезагрузка Nginx..."
systemctl reload nginx

print_success "HTTPS настроен успешно!"
print_info "Примечание: Браузер будет показывать предупреждение о самоподписанном сертификате."
print_info "Это нормально для внутренней сети. Нажмите 'Продолжить' или 'Advanced' -> 'Proceed to site'."
print_info ""
print_info "Доступ к приложению: https://${DOMAIN_NAME}"

