import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, parse } from 'path';
import sharp from 'sharp';

const SIZES = [
  { name: 'placeholder', width: 20, quality: 30 },
  { name: 'thumb', width: 800, quality: 80 },
  { name: 'full', width: 2400, quality: 85 },
] as const;

const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.tiff', '.webp']);

function rotatedDimensions(
  w: number,
  h: number,
  orientation?: number,
): [number, number] {
  // Orientations 5-8 swap width/height
  return orientation && orientation >= 5 ? [h, w] : [w, h];
}

async function main() {
  const [sourceDir, slug, category = 'fragments'] = process.argv.slice(2);

  if (!sourceDir || !slug) {
    console.error(
      'Usage: bun scripts/optimize-photos.ts <source-dir> <slug> [category]',
    );
    process.exit(1);
  }

  if (!existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  const outDir = join('public', 'images', category, slug);
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(sourceDir).filter(f => {
    const ext = parse(f).ext.toLowerCase();
    return SUPPORTED_EXTS.has(ext);
  });

  if (files.length === 0) {
    console.error('No supported image files found in source directory.');
    process.exit(1);
  }

  console.log(`Found ${files.length} photos. Processing into ${outDir}/\n`);
  console.log('# YAML-ready photo dimensions (paste into frontmatter):');
  console.log('photos:');

  for (const file of files.sort()) {
    const sourcePath = join(sourceDir, file);
    const baseName = parse(file).name;
    const sourceMtime = statSync(sourcePath).mtimeMs;

    const outputs = SIZES.map(s => ({
      ...s,
      path: join(outDir, `${baseName}-${s.name}.webp`),
    }));

    const allExist = outputs.every(
      o => existsSync(o.path) && statSync(o.path).mtimeMs > sourceMtime,
    );

    const meta = await sharp(sourcePath).metadata();
    const [w, h] = rotatedDimensions(
      meta.width!,
      meta.height!,
      meta.orientation,
    );

    if (allExist) {
      console.log(`  - file: ${baseName}\n    width: ${w}\n    height: ${h}`);
      console.log(`  [skip] ${baseName} — already up to date`);
      continue;
    }

    console.log(`  - file: ${baseName}\n    width: ${w}\n    height: ${h}`);

    for (const size of SIZES) {
      const outPath = join(outDir, `${baseName}-${size.name}.webp`);
      await sharp(sourcePath)
        .rotate()
        .resize(size.width, undefined, { withoutEnlargement: true })
        .webp({ quality: size.quality })
        .toFile(outPath);

      const stat = statSync(outPath);
      const kb = (stat.size / 1024).toFixed(1);
      console.log(`  [done] ${baseName}-${size.name}.webp (${kb}KB)`);
    }
  }

  console.log('\nDone!');
}

main();
