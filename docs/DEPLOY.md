# Triển khai DKLab theo ngành

Cùng một mã nguồn chạy được 3 kiểu. Tất cả được điều khiển bằng **biến môi trường** (hoặc file `src/site.config.ts` của từng nhánh), không cần sửa code.

| Kiểu | Dùng khi | Cấu hình chính |
|---|---|---|
| **A. Website demo** | Cho khách vào xem thử 1 ngành / nhiều ngành | `SEED=1`, `DEMO_MODE=1`, `PLUGINS=spa`, `DEFAULT_TENANT=spa_demo` |
| **B. Khách thật 1 ngành** | Bán cho 1 spa / 1 quán cà phê… chạy trên server riêng | `SEED=0`, `DEMO_MODE=0`, `TENANT_*`, `OWNER_*` |
| **C. Nền tảng nhiều khách (SaaS)** | 1 server phục vụ nhiều doanh nghiệp, mỗi khách 1 domain | `SEED=0`, `DEMO_MODE=0`, tạo khách tại `/superdklab` |

## Mã ngành có sẵn

| `industry` / `PLUGINS` | Ngành | Slug demo (`DEFAULT_TENANT`) | Nhánh demo | Cổng trong `compose.demos.yml` |
|---|---|---|---|---|
| `travel` | Du lịch – Lữ hành | `dulich_demo` | `demo/travel` | 3001 |
| `spa` | Spa – Làm đẹp | `spa_demo` | `demo/spa` | 3002 |
| `cafe` | Quán cà phê | `cafe_demo` | `demo/cafe` | 3003 |
| `restaurant` | Nhà hàng | `nhahang_demo` | `demo/restaurant` | 3004 |
| `hotel` | Khách sạn – Homestay | `khachsan_demo` | `demo/hotel` | 3005 |
| `accounting` | Dịch vụ kế toán | `ketoan_demo` | `demo/accounting` | 3006 |

Ngành mới: `npm run plugin:new <key> "<Tên ngành>" <tours|slots|tables|rooms>` → thư mục `src/plugins/<key>/` (xem README › Thêm ngành mới). Mọi lệnh dưới đây tự nhận ngành mới.

Tài khoản demo: `admin@ / letan@ / ketoan@<domain demo>` mật khẩu `Admin@123` (đổi bằng `SEED_ADMIN_PASSWORD`). Super Admin: `/superdklab` → `dklab` / `Dklab@123`.

---

## 1. Docker (VPS, máy chủ riêng)

Yêu cầu: Docker 24+ với Compose v2.24+.

### A. Website demo

```bash
cp .env.docker.example .env.docker
# sửa: APP_SECRET=<openssl rand -base64 48>, giữ SEED=1, DEMO_MODE=1
# chỉ 1 ngành: thêm PLUGINS=spa và DEFAULT_TENANT=spa_demo
docker compose up -d --build
```

Mở `http://localhost:3000` (website), `/login` (hiện sẵn tài khoản demo), `/admin`, `/superdklab`.

### Nhiều site demo cùng lúc (mỗi ngành 1 website)

```bash
export APP_SECRET="$(openssl rand -base64 48)"
docker compose -f docker/compose.demos.yml up -d --build
```

Build 1 image, chạy 6 website ở cổng 3001–3006, dùng chung 1 PostgreSQL và mỗi site có database riêng (`demo_spa`, `demo_cafe`…, tự tạo). Mỗi site chỉ seed và chỉ hiện tài khoản mẫu của ngành mình.

### B. Khách thật 1 ngành

Trong `.env.docker`:

```env
APP_SECRET=<chuỗi ngẫu nhiên ≥ 32 ký tự>
POSTGRES_PASSWORD=<mật khẩu mạnh>
PLATFORM_ADMIN_PASSWORD=<mật khẩu mạnh>
SEED=0
DEMO_MODE=0
TENANT_SLUG=spa_hoasen
TENANT_NAME=Spa Hoa Sen
TENANT_INDUSTRY=spa
TENANT_PLAN=pro
TENANT_DOMAINS=spahoasen.vn,www.spahoasen.vn
OWNER_NAME=Nguyễn Thị Hoa
OWNER_EMAIL=chu@spahoasen.vn
OWNER_PASSWORD=<mật khẩu ban đầu, ≥ 8 ký tự có chữ và số>
```

```bash
docker compose up -d --build                 # nhẹ hơn: PLUGINS=spa docker compose up -d --build
```

Lần chạy đầu container tự: tạo bảng → tạo Super Admin → tạo doanh nghiệp `spa_hoasen` với domain đã xác minh → chạy web. Các lần sau thì bỏ qua phần đã có, **không ghi đè mật khẩu**. Domain chung (localhost, IP) cũng tự hiển thị doanh nghiệp này.

### C. Nền tảng nhiều khách

`SEED=0`, `DEMO_MODE=0`, không khai báo `TENANT_*`. Có 2 cách tạo khách:

- Trên web: `/superdklab` → **Tạo doanh nghiệp** (chọn ngành).
- Từ dòng lệnh:

```bash
docker compose exec app node dist/tenant-new.mjs --industry cafe --slug cafe_mo \
  --name "Cafe Mơ" --email chu@cafemo.vn --password 'MatKhau123' --domain cafemo.vn --plan pro
docker compose exec app node dist/tenant-new.mjs --list        # xem các ngành
```

Khách trỏ domain về server. `<slug>.ROOT_DOMAIN` (vd `cafe-mo.dklab.vn`) cũng tự chạy.

### Vận hành

| Việc | Lệnh |
|---|---|
| Xem log | `docker compose logs -f app` |
| Sao lưu | `docker compose exec app node dist/db-backup.mjs` rồi `docker compose cp app:/app/backups ./backups` |
| Khôi phục | `docker compose cp ./file.json.gz app:/app/backups/` rồi `docker compose exec app node dist/db-restore.mjs backups/file.json.gz --force` |
| Cập nhật code | `git pull && docker compose up -d --build` (migration mới tự chạy) |
| Kiểm tra | `curl localhost:3000/api/health` |

### HTTPS + domain (bắt buộc khi chạy thật)

Cookie đăng nhập có cờ `Secure`, nên chỉ hoạt động qua HTTPS. Nếu thử nhanh qua `http://<IP>` trong mạng LAN thì đặt `COOKIE_SECURE=0`, và nhớ xóa dòng đó khi chạy thật. Cách đơn giản nhất là dùng Caddy, tự cấp SSL:

```caddyfile
# /etc/caddy/Caddyfile
spahoasen.vn, www.spahoasen.vn {
  reverse_proxy 127.0.0.1:3000
}
# nhiều site demo
spa.demo.dklab.vn   { reverse_proxy 127.0.0.1:3002 }
cafe.demo.dklab.vn  { reverse_proxy 127.0.0.1:3003 }
```

Nếu dùng Nginx thì **phải giữ Host gốc** (hệ thống nhận diện doanh nghiệp và chống CSRF theo Host):
`proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme;`

Database bên ngoài (Neon, RDS…): bỏ service `db`, đặt `DATABASE_URL` trong `.env.docker`.

---

## 2. Vercel — mỗi ngành 1 nhánh, 1 website demo

Mỗi nhánh `demo/<ngành>` chỉ khác nhánh chính ở file `src/site.config.ts`:

```ts
export const SITE = { plugins: ["spa"], defaultTenant: "spa_demo", demoMode: true };
```

Tạo website demo cho 1 ngành:

1. Vercel → **Add New Project** → chọn repo `dklab_system` → **Import**.
2. Đặt tên dự án (vd `dklab-spa-demo`). Trước khi Deploy, mở **Environment Variables** và thêm:
   - `APP_SECRET`: chuỗi ngẫu nhiên, mỗi project một chuỗi.
   - `ROOT_DOMAIN`, `PLATFORM_*`: tùy chọn.
   - Không cần `DEMO_MODE`, `DEFAULT_TENANT`, vì nhánh đã có sẵn.
3. **Storage → Neon → Create** để mỗi project có 1 database riêng (gói Free của Neon cho tạo nhiều).
4. **Settings → Git → Production Branch** = `demo/spa` → **Deployments → Redeploy**.
5. (Tùy chọn) **Settings → Domains** → thêm `spa.demo.dklab.vn`.

Build tự chạy migration và chỉ seed ngành của nhánh. Lặp lại với `demo/cafe`, `demo/hotel`…

Đưa thay đổi từ nhánh chính sang mọi nhánh demo:

```bash
bash scripts/sync-demo-branches.sh            # merge nhánh hiện tại vào demo/* rồi push
```

> Không muốn dùng nhánh? Có thể tạo nhiều project Vercel từ **cùng 1 nhánh**, mỗi project đặt env `PLUGINS=spa`, `DEFAULT_TENANT=spa_demo`, `DEMO_MODE=1`. Biến môi trường luôn được ưu tiên hơn `site.config.ts`.

---

## 3. Không dùng Docker (VPS cài Node 22)

```bash
npm ci
PLUGINS=spa npm run build                      # sinh registry ngành + migrate (nếu có DATABASE_URL) + build
DATABASE_URL=... TENANT_SLUG=... TENANT_INDUSTRY=spa OWNER_EMAIL=... OWNER_PASSWORD=... SEED=0 npm run db:setup
npm start                                      # chạy sau Caddy/Nginx; dùng pm2/systemd để tự khởi động lại
```

Biến môi trường đầy đủ: `.env.example` (Vercel/Node) và `.env.docker.example` (Docker).
