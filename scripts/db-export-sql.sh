#!/usr/bin/env bash
# Xuất file SQL thuần (giống bản backup pg_dump) để nạp bằng psql vào bất kỳ PostgreSQL ≥ 13:
#   database/schema.sql     – chỉ cấu trúc (bảng, index, ràng buộc, extension)
#   database/dklab_full.sql – cấu trúc + dữ liệu demo đầy đủ (tất cả ngành + super admin)
# Yêu cầu: pg_dump/psql cùng hoặc mới hơn phiên bản server. Dùng DB tạm, KHÔNG đụng DATABASE_URL thật.
#   ADMIN_URL=postgres://postgres:postgres@localhost:5432/postgres npm run db:export-sql
set -euo pipefail
ADMIN_URL="${ADMIN_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
TMP_DB="dklab_export_$$"
TMP_URL="${ADMIN_URL%/*}/${TMP_DB}"
cd "$(dirname "$0")/.."
mkdir -p database
cleanup() { psql "$ADMIN_URL" -qc "DROP DATABASE IF EXISTS \"$TMP_DB\" WITH (FORCE)" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "→ Tạo DB tạm $TMP_DB và chạy migrate + seed"
DATABASE_URL="$TMP_URL" APP_SECRET="${APP_SECRET:-export-only-secret-export-only-secret-0001}" npx tsx scripts/migrate.ts

OPTS=(--no-owner --no-privileges --no-comments --quote-all-identifiers)
strip() { sed -e 's/^CREATE SCHEMA "\(.*\)";/CREATE SCHEMA IF NOT EXISTS "\1";/' -e '/^\\restrict /d' -e '/^\\unrestrict /d' -e '/^-- Dumped from/d' -e '/^-- Dumped by/d' -e '/^SET transaction_timeout/d'; }
HDR="-- DKLab database — sinh bởi npm run db:export-sql. Nạp: psql \"\$DATABASE_URL\" -v ON_ERROR_STOP=1 -f <file>
-- Yêu cầu PostgreSQL >= 13 và extension btree_gist (gói postgresql-contrib).
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;"

{ echo "$HDR"; echo "-- Chỉ cấu trúc. Sau khi nạp, chạy: npm run db:setup để seed dữ liệu demo (tùy chọn)."; pg_dump "$TMP_URL" "${OPTS[@]}" --schema-only -n public -n drizzle | strip
  echo "-- Lịch sử migration (để npm run db:setup biết bảng đã có, không tạo lại)"
  pg_dump "$TMP_URL" "${OPTS[@]}" --data-only -t 'drizzle.__drizzle_migrations' | strip | sed -n '/^COPY\|^SELECT pg_catalog.setval/,/^\\\.$\|;$/p'; } > database/schema.sql
{ echo "$HDR"; echo "-- Cấu trúc + dữ liệu demo. Tài khoản: dklab/Dklab@123 (/superdklab), admin@dulichdemo.vn (và admin@<domain> từng ngành) / Admin@123. ĐỔI MẬT KHẨU khi chạy thật."; pg_dump "$TMP_URL" "${OPTS[@]}" -n public -n drizzle --exclude-table-data='public.sessions' | strip; } > database/dklab_full.sql
echo "✓ database/schema.sql ($(wc -l < database/schema.sql) dòng), database/dklab_full.sql ($(wc -l < database/dklab_full.sql) dòng)"
