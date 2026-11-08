// Places the artworks in public/plates. The scroll is copied byte for byte;
// the other images are only cropped or scaled. Usage: npm run plates -- <folder>
import fs from 'node:fs';
import sharp from 'sharp';

const from = process.argv[2];
if (!from) throw new Error('Pass the folder that holds palace.jpg, lanting.jpg and wolf.jpg.');

const out = 'public/plates';
fs.mkdirSync(out, { recursive: true });

fs.copyFileSync(`${from}/palace.jpg`, `${out}/luo-scroll.jpg`);

await sharp(`${from}/palace.jpg`)
  .extract({ left: 230, top: 0, width: 700, height: 380 })
  .jpeg({ quality: 92 })
  .toFile(`${out}/luo-departure.jpg`);

await sharp(`${from}/lanting.jpg`)
  .extract({ left: 60, top: 30, width: 680, height: 1420 })
  .jpeg({ quality: 88 })
  .toFile(`${out}/lanting-detail.jpg`);

await sharp(`${from}/wolf.jpg`)
  .resize({ width: 1400 })
  .jpeg({ quality: 86 })
  .toFile(`${out}/wolfs-glen.jpg`);

const band = await sharp(`${from}/palace.jpg`)
  .extract({ left: 1500, top: 0, width: 1200, height: 380 })
  .toBuffer();

await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#f6f2ea' } })
  .composite([{ input: band, left: 0, top: 125 }])
  .jpeg({ quality: 88 })
  .toFile('public/og.jpg');
