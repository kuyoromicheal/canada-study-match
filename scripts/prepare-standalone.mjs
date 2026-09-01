/**
 * Copies static assets into dist/standalone for portable Node deployment.
 * Run after: npm run build
 */
import { cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const root = process.cwd();
const standalone = join(root, "dist", "standalone");
const staticSrc = join(root, "dist", "static");
const publicSrc = join(root, "public");

if (!existsSync(standalone)) {
  console.error("dist/standalone not found. Run npm run build first.");
  process.exit(1);
}

if (existsSync(staticSrc)) {
  const staticDest = join(standalone, "dist", "static");
  mkdirSync(join(standalone, "dist"), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log("Copied dist/static → dist/standalone/dist/static");
}

if (existsSync(publicSrc)) {
  cpSync(publicSrc, join(standalone, "public"), { recursive: true });
  console.log("Copied public → dist/standalone/public");
}

console.log("Standalone bundle ready. Run: npm run start:dist");
