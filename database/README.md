# Database DKLab (PostgreSQL ≥ 13)

Chạy được trên **mọi PostgreSQL ≥ 13**: máy local, Docker, VPS, Neon, Supabase, AWS RDS/Aurora, Google Cloud SQL, Azure, Railway, Render…
Yêu cầu duy nhất: extension `btree_gist` (có sẵn ở tất cả nhà cung cấp trên; trên Ubuntu/Debian nằm trong gói `postgresql-contrib`).

## Cách 1 — Một lệnh (khuyên dùng)

```bash
DATABASE_URL="postgres://user:pass@host:5432/dklab" npm run db:setup
```

- Database chưa có → tự `CREATE DATABASE` (nếu tài khoản có quyền).
- Kiểm tra phiên bản server + `btree_gist`, chạy toàn bộ migration trong `drizzle/`, seed 6 doanh nghiệp demo + Super Admin.
- Chạy lại bao nhiêu lần cũng được (bỏ qua phần đã có). `SEED=0` để chỉ tạo bảng, không seed.

## Cách 2 — Nạp file SQL như bản backup (không cần Node)

| File | Nội dung |
|---|---|
| `schema.sql` | Toàn bộ bảng, index, ràng buộc, extension + lịch sử migration |
| `dklab_full.sql` | Như trên + dữ liệu demo đầy đủ của tất cả ngành |

```bash
createdb dklab                                   # hoặc tạo trên trang quản trị nhà cung cấp
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/dklab_full.sql
```

Sau khi nạp, app chạy được ngay; `npm run db:setup` / build trên Vercel nhận ra migration đã có và không tạo lại.
Tài khoản demo: Super Admin `dklab` / `Dklab@123` tại `/superdklab`; doanh nghiệp `admin@dulichdemo.vn` … / `Admin@123` — **đổi mật khẩu khi chạy thật**.

Sinh lại 2 file sau khi thêm migration/plugin mới (dùng DB tạm, không đụng DB thật):

```bash
ADMIN_URL=postgres://postgres:postgres@localhost:5432/postgres npm run db:export-sql
```

## Sao lưu & chuyển server

```bash
DATABASE_URL=<server cũ> npm run db:backup                       # → backups/backup-YYYYMMDD-HHmm.json.gz
DATABASE_URL=<server mới> npm run db:restore -- backups/backup-….json.gz
```

- Không cần cài `pg_dump`; snapshot nhất quán kể cả khi app đang chạy.
- Restore: tự tạo database + bảng, nạp dữ liệu trong **1 transaction** (lỗi → không ghi gì). Database đích phải trống, hoặc thêm `--force` để **xóa sạch** rồi ghi đè.
- Không sao lưu bảng `sessions` → người dùng chỉ cần đăng nhập lại.
- File backup chứa hash mật khẩu và cấu hình MISA được mã hóa bằng `APP_SECRET`: **giữ bí mật** (thư mục `backups/` đã gitignore) và dùng **cùng `APP_SECRET`** ở server mới.
- Có `pg_dump` thì cũng có thể dùng cách truyền thống: `pg_dump --no-owner --no-privileges "$OLD" | psql "$NEW"`.

## Vì sao không hỗ trợ MySQL?

Hệ thống dùng các tính năng chỉ PostgreSQL có, và chúng là phần cốt lõi về an toàn dữ liệu:
ràng buộc `EXCLUDE USING gist` chống đặt trùng phòng/bàn/khung giờ ngay ở tầng database, `jsonb` cho cấu hình từng doanh nghiệp,
`timestamptz`/`tstzrange`, UUID. Chuyển sang MySQL sẽ phải bỏ các bảo đảm này. PostgreSQL có ở mọi nhà cung cấp lớn (kể cả gói miễn phí của Neon/Supabase), nên đây là lựa chọn an toàn nhất.
