# syntax=docker/dockerfile:1.7
# ────────────────────────────────────────────────────────────────────────────
# DKLab — image production (Next.js standalone, ~440 MB, chạy user không phải root)
#
#   docker build -t dklab .                                   # đủ mọi ngành
#   docker build -t dklab-spa --build-arg PLUGINS=spa .       # chỉ đóng gói ngành spa
#
# Container tự chạy migration (+ tạo doanh nghiệp từ TENANT_* nếu có) rồi mới khởi động web.
# ────────────────────────────────────────────────────────────────────────────
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
# Ngành được đóng gói (rỗng = theo src/site.config.ts, mặc định tất cả)
ARG PLUGINS=""
ENV PLUGINS=${PLUGINS}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 1) sinh registry plugin  2) build web  3) gói các script quản trị DB thành file .mjs độc lập
RUN npx tsx scripts/gen-plugins.ts \
 && npx next build \
 && npx esbuild scripts/migrate.ts scripts/tenant-new.ts scripts/db-backup.ts scripts/db-restore.ts \
      --bundle --platform=node --format=esm --target=node22 --outdir=dist --out-extension:.js=.mjs \
      --external:@node-rs/argon2 --log-level=warning \
      "--banner:js=import{createRequire as __cr}from'node:module';const require=__cr(import.meta.url);"

FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 TZ=Asia/Ho_Chi_Minh
RUN groupadd -r -g 1001 dklab && useradd -r -u 1001 -g dklab dklab
COPY --from=build --chown=dklab:dklab /app/.next/standalone ./
COPY --from=build --chown=dklab:dklab /app/.next/static ./.next/static
COPY --from=build --chown=dklab:dklab /app/public ./public
COPY --from=build --chown=dklab:dklab /app/dist ./dist
COPY --from=build --chown=dklab:dklab /app/drizzle ./drizzle
COPY --chown=dklab:dklab docker/entrypoint.sh /usr/local/bin/dklab-entrypoint
# Bỏ ký tự \r nếu file bị đổi sang CRLF khi clone trên Windows
RUN sed -i 's/\r$//' /usr/local/bin/dklab-entrypoint && chmod +x /usr/local/bin/dklab-entrypoint && mkdir -p /app/backups && chown dklab:dklab /app/backups
USER dklab
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["dklab-entrypoint"]
CMD ["node", "server.js"]
