#!/bin/sh
# Khởi động container DKLab:
#   1. Chờ database sẵn sàng, chạy migration + seed (tắt bằng RUN_MIGRATIONS=0)
#   2. Tạo doanh nghiệp từ TENANT_* lần đầu (nếu khai báo)
#   3. Chạy web
# Lệnh quản trị trong container:  docker compose exec app node dist/tenant-new.mjs --help
#                                 docker compose exec app node dist/db-backup.mjs
set -e

# Doanh nghiệp riêng => mặc định hiển thị doanh nghiệp đó trên localhost/IP
if [ -n "$TENANT_SLUG" ] && [ -z "$DEFAULT_TENANT" ]; then export DEFAULT_TENANT="$TENANT_SLUG"; fi

if [ "${RUN_MIGRATIONS:-1}" != "0" ] && [ "$1" = "node" ] && [ "$2" = "server.js" ]; then
  tries=0
  until node dist/migrate.mjs; do
    tries=$((tries + 1))
    if [ "$tries" -ge "${DB_WAIT_RETRIES:-15}" ]; then echo "✗ Migration thất bại sau $tries lần thử" >&2; exit 1; fi
    echo "… database chưa sẵn sàng, thử lại sau 3s ($tries)"; sleep 3
  done
fi
exec "$@"
