/**
 * Quét src/plugins/<key>/manifest.ts (+ seed.ts) và sinh 2 file registry:
 *   src/plugins/_registry.ts  (manifest, dùng được ở client)
 *   src/plugins/_seeds.ts     (dữ liệu demo, chỉ dùng trong script seed)
 * Chạy tự động trước dev/build. Thêm ngành = thêm thư mục, không sửa code core.
 */
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "src/plugins");
const keys = readdirSync(dir)
  .filter((d) => !d.startsWith("_") && statSync(join(dir, d)).isDirectory() && existsSync(join(dir, d, "manifest.ts")))
  .sort();
const id = (k: string) => k.replace(/[^a-zA-Z0-9]/g, "_");

const header = "// ⚠️ File tự sinh bởi scripts/gen-plugins.ts — không sửa tay.\n";
writeFileSync(
  join(dir, "_registry.ts"),
  header +
    'import type { PluginManifest } from "./types";\n' +
    keys.map((k) => `import { plugin as ${id(k)} } from "./${k}/manifest";`).join("\n") +
    `\n\nexport const PLUGINS: PluginManifest[] = [${keys.map(id).join(", ")}];\n`,
);
const seeded = keys.filter((k) => existsSync(join(dir, k, "seed.ts")));
writeFileSync(
  join(dir, "_seeds.ts"),
  header +
    'import type { DemoSeed } from "./types";\n' +
    seeded.map((k) => `import { demo as ${id(k)} } from "./${k}/seed";`).join("\n") +
    `\n\nexport const DEMO_SEEDS: { industry: string; demo: DemoSeed }[] = [\n${seeded.map((k) => `  { industry: "${k}", demo: ${id(k)} },`).join("\n")}\n];\n`,
);
console.log(`✓ Plugin: ${keys.join(", ")} (${seeded.length} có dữ liệu demo)`);
