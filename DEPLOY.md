# DEPLOY.md — Deployment Guide

## Домен

https://makaroshik.com/aitown

## Первый запуск

```bash
# 1. Convex backend + dashboard (Docker)
docker compose up backend dashboard -d

# 2. Frontend + Convex watcher
nohup npm run dev > dev.log 2>&1 &

# 3. Запустить движок игры
npx convex run testing:resume
```

## Перезапуск

```bash
# Убить frontend
pkill -f "npm run dev" ; pkill -f "vite" ; pkill -f "convex dev"

# Перезапустить backend
docker compose restart backend dashboard

# Запустить frontend
nohup npm run dev > dev.log 2>&1 &

# Если движок встал
npx convex run testing:resume
```

## Полный ресет мира

```bash
npx convex run testing:stop
npx convex run testing:wipeAllTables
npx convex run init
npx convex run testing:resume
```

## Обновление кода

```bash
git pull
pkill -f "npm run dev" ; pkill -f "vite" ; pkill -f "convex dev"
nohup npm run dev > dev.log 2>&1 &
```

## Проверка статуса

```bash
# Docker контейнеры
docker compose ps

# Frontend процесс
pgrep -fa vite

# Порты
ss -tlnp | grep -E '3210|5173|6791'

# Логи frontend
tail -f dev.log

# Логи Convex backend
docker compose logs -f backend
```

## Nginx

Конфиг: `/etc/nginx/sites-enabled/makaroshik.com`

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Convex proxy (обязательно!)

Добавить в nginx конфиг **ПЕРЕД** блоком `/aitown`:

```nginx
location /convex/ {
    proxy_pass http://127.0.0.1:3210/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

Это проксирует WebSocket и storage URLs (спрайты, портреты, музыка) через nginx.

## Проверка после деплоя

```bash
# 1. Convex proxy работает
curl -s https://makaroshik.com/convex/version
# Должен вернуть "unknown"

# 2. Тайлсет грузится
curl -sI https://makaroshik.com/aitown/assets/festival-tileset.png | head -1
# HTTP/2 200

# 3. В браузере: makaroshik.com/aitown
# - WebSocket коннектится к wss://makaroshik.com/convex/...
# - Спрайты/портреты грузятся через /convex/api/storage/...
# - Анимации грузятся из /aitown/assets/spritesheets/...
```
