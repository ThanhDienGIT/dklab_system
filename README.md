# DKLab Platform: nền tảng quản lý đa ngành

Một source code chạy cho nhiều khách hàng (multi-tenant), chia theo plugin cho từng ngành: **du lịch** (đã có), cà phê, nhà hàng, khách sạn, spa, kế toán (cùng khuôn module).
Mỗi khách hàng có domain riêng, phân quyền riêng, website đặt chỗ và trang quản trị riêng.

> Tenant demo: **`dulich_demo`** (Du Lịch Demo): 6 tour, lịch khởi hành, 4 tài khoản nhân viên.

| Website khách | Đặt tour | Lễ tân tiếp nhận | Hóa đơn + VietQR + MISA |
|---|---|---|---|
| ![](docs/screenshots/home.png) | ![](docs/screenshots/tour.png) | ![](docs/screenshots/bookings.png) | ![](docs/screenshots/invoice.png) |

## Công nghệ

| Lớp | Lựa chọn | Lý do |
|---|---|---|
| Framework | **Next.js 16.4** (App Router, Cache Components, `proxy.ts`), React 19.3 | Một app gồm cả website, admin và API |
| State client | **Redux Toolkit 2 + RTK Query + redux-persist** | Mỗi dữ liệu chỉ tải 1 lần; F5 hiện ngay từ cache rồi làm mới ngầm |
| UI | Tailwind CSS v4, lucide-react, font Be Vietnam Pro | Nhẹ, đổi màu thương hiệu theo tenant bằng CSS variable |
| DB | PostgreSQL + **Drizzle ORM** (postgres.js) | Nhẹ, SQL rõ ràng, chạy tốt với Neon trên Vercel |
| Auth | **JWT tự xây bằng `jose`** + argon2id (`@node-rs/argon2`) | Kiểm soát claims, tenant và xoay vòng refresh token |
| Validate | Zod 4 | Thông báo lỗi tiếng Việt |
| Thanh toán | **VietQR (EMVCo/NAPAS)** tự sinh + `qrcode` | Mọi app ngân hàng quét được, không phí, không phụ thuộc bên thứ ba |
| HĐĐT | **MISA meInvoice** adapter (mock / test / live) | Đẩy hóa đơn, phát hành, lưu số HĐ |

## Kiến trúc

```
Host (dulichabc.vn / dulich-demo.dklab.vn / *.vercel.app)
        │
   src/proxy.ts ── xác định tenant theo domain ── rewrite /  →  /s/<tenant>/…
        │                                     └── chặn /admin khi chưa đăng nhập
        ├── /s/[tenant]/…        Website public (Server Components + 'use cache', tag theo tenant)
        ├── /pay/[token]         Trang thanh toán hóa đơn của khách (VietQR)
        ├── /admin/…             Quản trị (Client + Redux/RTK Query, cache localStorage)
        └── /api/auth/*, /api/v1/*, /api/public/*   REST API dùng chung web / mobile / POS
```

```
src/
  modules/registry.ts   ← Plugin: mỗi module khai báo quyền + menu
  modules/presets.ts    ← Preset ngành (module bật sẵn) + vai trò mặc định
  lib/auth/             ← JWT, phiên, mật khẩu
  lib/api.ts            ← withAuth(permission, handler): xác thực + phân quyền + phạm vi
  lib/payments/vietqr.ts← Sinh VietQR (CRC16, TLV EMVCo)
  lib/einvoice/misa.ts  ← Adapter MISA meInvoice
  lib/db/schema.ts      ← Lược đồ (mọi bảng có tenant_id)
  store/                ← Redux store, RTK Query API, persist
  app/                  ← Trang + API route
```

### Module / core có sẵn

- **Hệ thống**: tenant, domain riêng, cài đặt thương hiệu, nhật ký thao tác (audit log)
- **Xác thực & phân quyền**: JWT, vai trò, ma trận quyền theo module, phạm vi `tenant`/`own`
- **Tiếp nhận đặt chỗ** (engine dùng chung cho tour, bàn, phòng, lịch spa): khách để lại họ tên và **SĐT (ưu tiên) hoặc email**, không cần tài khoản. Lễ tân thấy danh sách, bấm gọi / Zalo, chuyển trạng thái *Mới → Đã liên hệ → Xác nhận → Hoàn tất / Hủy*. **Chỉ khi xác nhận mới trừ chỗ** (khóa dòng, chống bán vượt).
- **Khách hàng (CRM)**: tự tạo / gộp theo SĐT, lịch sử đặt chỗ và hóa đơn, tag, ghi nhận đồng ý dữ liệu (NĐ 13/2023)
- **Nhân sự**: hồ sơ nhân viên, chức vụ, phòng ban, chi nhánh, lương cơ bản, liên kết tài khoản
- **Hóa đơn & thanh toán**: lập từ đặt chỗ, thuế GTGT theo dòng (0/5/8/10%, KCT, KKKNT), số tiền bằng chữ, in / PDF, **VietQR theo tài khoản ngân hàng chọn**, link thanh toán gửi khách, ghi nhận thu tiền nhiều lần
- **HĐĐT MISA**: đẩy hóa đơn sang MISA, phát hành, lưu ký hiệu / số / mã CQT
- **Du lịch – Tour**: tour, lịch trình, lịch khởi hành, số chỗ, giá người lớn / trẻ em / giá riêng từng ngày

## Bảo mật & JWT

- **Access token** JWT HS256, sống 15 phút, gửi qua cookie `httpOnly; Secure; SameSite=Lax` (web) hoặc `Authorization: Bearer` (mobile/POS, dùng `returnTokens: true` khi login).
  - Claims: `sub`, `tid` (tenant), `aud=tenant:<slug>` (chặn dùng chéo tenant), `sid`, `tv`, `perms`, `roles`.
- **Refresh token** ngẫu nhiên 256-bit, DB chỉ lưu SHA-256, sống 30 ngày, cookie `path=/api/auth; SameSite=Strict`.
  - **Xoay vòng mỗi lần refresh**. Token cũ bị dùng lại sau 30 giây ân hạn thì thu hồi cả phiên (phát hiện đánh cắp).
- Khóa tài khoản / đặt lại mật khẩu: thu hồi mọi phiên ngay. Đổi vai trò có hiệu lực ở lần refresh kế tiếp (≤ 15 phút).
- Mật khẩu argon2id (tham số OWASP). Khóa 15 phút sau 5 lần sai. Thời gian phản hồi cân bằng để không dò được tài khoản có tồn tại hay không.
- Quyền dạng `module.resource.action[:scope]`, kiểm tra ở **server**. Ẩn nút trên giao diện chỉ là phụ.
- Mật khẩu MISA lưu mã hóa AES-256-GCM. API không bao giờ trả về.
- Form public có honeypot + giới hạn tần suất theo IP. Production nên chuyển sang Upstash/Redis.

## Tốc độ / cache

- **Admin**: RTK Query cache + `redux-persist` (localStorage).
  - Mở lại hoặc F5 thì hiển thị ngay từ cache (đã đo: ~180 ms, kể cả khi API không phản hồi), sau đó tự làm mới ngầm nếu dữ liệu cũ hơn 30 giây.
  - Thêm / sửa / xóa chỉ invalidate đúng nhóm dữ liệu liên quan. Danh sách đặt chỗ tự làm mới mỗi 30 giây.
  - Đăng xuất hoặc đổi người dùng thì xóa sạch cache.
- **Website public**: Server Components + `'use cache'` (Cache Components), cache theo tag `tours:<tenantId>`. Admin sửa tour hay xác nhận đặt chỗ thì `revalidateTag` ngay, nên số chỗ trống luôn đúng.
- Trang admin build thành HTML tĩnh. Trang public là Partial Prerender.

## Chạy local

```bash
cp .env.example .env.local      # sửa DATABASE_URL, APP_SECRET
npm install
npm run db:migrate              # tạo bảng + seed tenant dulich_demo
npm run dev
```

- Website: http://localhost:3000
- Quản trị: http://localhost:3000/admin
- Xem tenant khác trên domain chung: `?tenant=<slug>`

| Tài khoản demo (mật khẩu `Admin@123`) | Vai trò |
|---|---|
| admin@dulichdemo.vn | Chủ doanh nghiệp (toàn quyền) |
| letan@dulichdemo.vn | Lễ tân: tiếp nhận đặt chỗ, lập hóa đơn |
| ketoan@dulichdemo.vn | Kế toán: hóa đơn, thanh toán, MISA |
| hdv@dulichdemo.vn / 0900000004 | Nhân viên: chỉ việc được giao |

## Deploy Vercel (demo)

1. Import repo vào Vercel (Framework: Next.js).
2. **Storage → Neon Postgres** (Marketplace): `DATABASE_URL` được gán tự động.
3. Thêm biến môi trường:
   - `APP_SECRET`: chuỗi ngẫu nhiên ≥ 32 ký tự (`openssl rand -base64 48`)
   - `DEFAULT_TENANT=dulich_demo`
   - `ROOT_DOMAIN`: domain gốc của bạn, vd `dklab.vn`
   - `SEED_ADMIN_PASSWORD`: mật khẩu cho tài khoản demo
4. Deploy. Lệnh `npm run build` tự chạy migrate + seed (idempotent) rồi `next build`.
5. Domain:
   - Truy cập `*.vercel.app` thì vào tenant mặc định.
   - Domain riêng của khách: thêm domain vào project Vercel → trỏ DNS theo hướng dẫn → khai báo domain trong **Admin → Cài đặt → Tên miền**.
   - Subdomain kiểu `<khach>.dklab.vn`: thêm wildcard `*.dklab.vn` vào Vercel (cần dùng nameserver của Vercel).

## MISA meInvoice

- Mặc định chạy **chế độ giả lập (mock)** để demo toàn bộ luồng mà không cần tài khoản.
- Chạy thật: Admin → Cài đặt → Hóa đơn điện tử → chọn **MISA Test** hoặc **Production**, điền AppID (MISA cấp), MST, tài khoản, mật khẩu, ký hiệu hóa đơn → *Kiểm tra kết nối*.
- Luồng:
  1. Lấy token: `POST /api/integration/auth/token`
  2. Tạo hóa đơn: `POST /api/v3[/code]/itg/invoicepublishing/createinvoice`, nhận `TransactionID`
  3. Ký số
  4. Phát hành: `POST /api/v3[/code]/itg/invoicepublishing`
- Vercel không truy cập được USB token, nên bước ký số làm trên MISA meInvoice, hoặc dán XML đã ký (HSM / công cụ ký) để phát hành từ hệ thống.
- ⚠️ Đường dẫn API lấy theo tài liệu công khai tại doc.meinvoice.vn. **Cần chạy thử trên môi trường test của MISA với tài khoản thật** trước khi dùng production. Có ô *Base URL* để ghi đè nếu MISA cấp đường dẫn khác.

## Thêm ngành mới (vd: quán cà phê)

1. Khai báo module `table` / `menu` trong `src/modules/registry.ts` (quyền + menu).
2. Thêm bảng (`tables`, `menu_items`…) vào `schema.ts` → `npm run db:generate`.
3. API trong `src/app/api/v1/<module>/`. Dùng lại `booking_requests` với `resourceType: "table"`.
4. Trang admin trong `src/app/admin/<module>/` + endpoint RTK Query trong `src/store/api.ts`.
5. Bật module trong preset `src/modules/presets.ts`. Tạo tenant mới với `industry: "cafe"`.

Phần dùng lại nguyên vẹn: đăng nhập, phân quyền, khách hàng, nhân sự, hóa đơn, VietQR, MISA, domain, nhật ký.

## Lộ trình tiếp theo

- Module bàn (sơ đồ bàn realtime) + menu / gọi món cho cà phê, nhà hàng
- Module phòng (khách sạn), lịch kỹ thuật viên (spa)
- Super-admin tạo tenant / gói dịch vụ qua giao diện (hiện tạo bằng seed / SQL)
- Webhook ngân hàng (Casso / SePay) để tự đối soát chuyển khoản VietQR
- Gửi SMS / Zalo ZNS / email xác nhận; chấm công, ca làm, lương
