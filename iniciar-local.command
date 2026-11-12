#!/bin/zsh
set -e
cd "$(dirname "$0")"
export PATH="/opt/homebrew/opt/node@20/bin:/usr/local/bin:$PATH"
if ! docker info >/dev/null 2>&1; then
  echo "Abrí Docker Desktop y volvé a ejecutar este archivo."
  read "?Presioná Enter para cerrar."
  exit 1
fi
docker compose up -d mysql
if curl -fsS http://127.0.0.1:5173/api/health >/dev/null 2>&1; then
  echo "Morowa ya está iniciada. Abrí http://localhost:5173"
  read "?Presioná Enter para cerrar."
  exit 0
fi
npm run dev:lan
