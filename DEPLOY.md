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
