/**
 * One-off backfill script: generate `-small.webp` (480px) siblings from the
 * existing `-thumb.webp` (800px) derivatives across every category under
 * public/images/.
 *
 * We do this because optimize-photos.ts expects the original source images,
 * which are not checked in. Downsizing from the 800px thumb to 480px yields
 * near-identical results to a fresh encode from source for our purposes.
 *
 * Usage: bun scripts/generate-small-variants.ts
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const ROOT = join('public', 'images');
const CATEGORIES = ['fragments', 'signals', 'constructs', 'heroes'];
const SMALL_WIDTH = 480;
const SMALL_QUALITY = 78;

async function main() {
  let generated = 0;
  let skipped = 0;

  for (const category of CATEGORIES) {
    const catDir = join(ROOT, category);
    if (!existsSync(catDir)) continue;

    const entries = readdirSync(catDir);
    for (const entry of entries) {
      const entryPath = join(catDir, entry);
      if (!statSync(entryPath).isDirectory()) continue;

      const files = readdirSync(entryPath);
      const thumbs = files.filter(f => f.endsWith('-thumb.webp'));

      for (const thumb of thumbs) {
        const base = thumb.replace(/-thumb\.webp$/, '');
        const thumbPath = join(entryPath, thumb);
        const smallPath = join(entryPath, `${base}-small.webp`);

        if (
          existsSync(smallPath) &&
          statSync(smallPath).mtimeMs > statSync(thumbPath).mtimeMs
        ) {
          skipped++;
          continue;
        }

        await sharp(thumbPath)
          .resize(SMALL_WIDTH, undefined, { withoutEnlargement: true })
          .webp({ quality: SMALL_QUALITY })
          .toFile(smallPath);

        const size = (statSync(smallPath).size / 1024).toFixed(1);
        console.log(
          `  [done] ${category}/${entry}/${base}-small.webp (${size}KB)`,
        );
        generated++;
      }
    }
  }

  console.log(`\nGenerated ${generated} small variants (${skipped} skipped).`);
}

main();
