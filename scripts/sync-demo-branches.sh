#!/usr/bin/env bash
# Tạo / cập nhật các nhánh demo/<ngành> từ nhánh hiện tại, rồi push.
# Mỗi nhánh demo chỉ khác nhánh gốc ở src/site.config.ts (ngành, doanh nghiệp mặc định, DEMO_MODE).
#
#   bash scripts/sync-demo-branches.sh                 # mọi ngành có seed demo + travel
#   bash scripts/sync-demo-branches.sh spa cafe        # chỉ một số ngành
#   NO_PUSH=1 bash scripts/sync-demo-branches.sh       # chỉ cập nhật local
set -euo pipefail
cd "$(dirname "$0")/.."

[ -z "$(git status --porcelain)" ] || { echo "✗ Còn thay đổi chưa commit — commit hoặc stash trước"; exit 1; }
BASE="$(git rev-parse --abbrev-ref HEAD)"
case "$BASE" in demo/*) echo "✗ Hãy chạy từ nhánh chính, không phải $BASE"; exit 1;; esac

# slug demo của từng ngành: travel cố định, các ngành khác lấy từ src/plugins/<key>/seed.ts
slug_of() {
  if [ "$1" = "travel" ]; then echo "dulich_demo"; return; fi
  grep -oE 'slug: *"[a-z0-9_]+"' "src/plugins/$1/seed.ts" | head -1 | sed -E 's/.*"(.*)"/\1/'
}

if [ $# -gt 0 ]; then INDUSTRIES=("$@"); else
  INDUSTRIES=()
  for d in src/plugins/*/; do k="$(basename "$d")"; case "$k" in _*) continue;; esac
    if [ "$k" = "travel" ] || [ -f "src/plugins/$k/seed.ts" ]; then INDUSTRIES+=("$k"); fi
  done
fi

git fetch -q origin || true
for k in "${INDUSTRIES[@]}"; do
  [ -f "src/plugins/$k/manifest.ts" ] || { echo "✗ Không có ngành $k"; exit 1; }
  slug="$(slug_of "$k")"
  br="demo/$k"
  echo "→ $br (PLUGINS=$k, DEFAULT_TENANT=$slug)"
  if git show-ref -q --verify "refs/heads/$br"; then git checkout -q "$br"
  elif git show-ref -q --verify "refs/remotes/origin/$br"; then git checkout -q -b "$br" "origin/$br"
  else git checkout -q -b "$br" "$BASE"; fi

  if ! git merge -q --no-edit "$BASE" 2>/dev/null; then
    # Xung đột chỉ được phép ở site.config.ts (file riêng của nhánh demo) — ghi lại bên dưới
    if git diff --name-only --diff-filter=U | grep -qv '^src/site.config.ts$'; then
      echo "✗ Xung đột ngoài site.config.ts trên $br — xử lý tay"; git merge --abort; git checkout -q "$BASE"; exit 1
    fi
  fi
  node -e '
    const fs = require("fs"), p = "src/site.config.ts", [k, slug] = process.argv.slice(1);
    let s = fs.readFileSync(p, "utf8");
    s = s.replace(/export const SITE = \{[\s\S]*?\n\};/, `export const SITE = {\n  plugins: ["${k}"] as string[],\n  defaultTenant: "${slug}",\n  demoMode: true,\n};`);
    fs.writeFileSync(p, s);' "$k" "$slug"
  git add src/site.config.ts
  if ! git diff --cached --quiet || [ -f .git/MERGE_HEAD ]; then git commit -q --no-edit -m "demo/$k: chỉ ngành $k, mặc định $slug, bật DEMO_MODE" ; fi
  if [ "${NO_PUSH:-0}" != "1" ]; then
    for wait in 2 4 8 16 0; do
      git push -q -u origin "$br" && break
      [ "$wait" = 0 ] && { echo "✗ Không push được $br"; git checkout -q "$BASE"; exit 1; }
      echo "  push lỗi, thử lại sau ${wait}s"; sleep "$wait"
    done
  fi
done
git checkout -q "$BASE"
echo "✓ Xong: ${INDUSTRIES[*]}"
