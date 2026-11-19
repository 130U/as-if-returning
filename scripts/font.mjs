// Subsets Noto Serif SC to the characters the Chinese page uses.
// Run again whenever the Chinese text changes. Usage: npm run font -- <NotoSerifSC.ttf>
import fs from 'node:fs';
import subsetFont from 'subset-font';

const source = fs.readFileSync(process.argv[2]);
const article = fs.readFileSync('src/content/article.zh.md', 'utf8');
const page = fs.readFileSync('src/components/Page.astro', 'utf8');
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const chars = [...new Set(article + page + ascii)].join('');

const subset = await subsetFont(source, chars, { targetFormat: 'woff2' });
fs.mkdirSync('src/assets/fonts', { recursive: true });
fs.writeFileSync('src/assets/fonts/noto-serif-sc.woff2', subset);
console.log(`${[...chars].length} characters, ${(subset.length / 1024).toFixed(0)} KB`);
