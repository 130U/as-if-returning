// Draws the shadow of the melody: the recording's spectrum as ink, low notes
// at the waterline, time running right to left like the scroll above it.
// Usage: npm run shadow -- <16-bit stereo WAV>
import fs from 'node:fs';
import sharp from 'sharp';

const file = fs.readFileSync(process.argv[2]);
let offset = 12;
let pcm;
while (offset + 8 <= file.length) {
  const id = file.toString('latin1', offset, offset + 4);
  const size = file.readUInt32LE(offset + 4);
  if (id === 'data') {
    pcm = new Int16Array(file.buffer.slice(file.byteOffset + offset + 8, file.byteOffset + offset + 8 + size - (size % 2)));
    break;
  }
  offset += 8 + size + (size & 1);
}

const decimate = 4;
const rate = 48000 / decimate;
const samples = new Float32Array(Math.floor(pcm.length / 2 / decimate));
for (let i = 0; i < samples.length; i += 1) {
  let sum = 0;
  for (let j = 0; j < decimate; j += 1) sum += pcm[(i * decimate + j) * 2] + pcm[(i * decimate + j) * 2 + 1];
  samples[i] = sum / (2 * decimate * 32768);
}

const N = 2048;
const hop = 600;
const hann = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
const bits = Math.log2(N);
const reversed = Uint32Array.from({ length: N }, (_, i) => {
  let r = 0;
  for (let b = 0; b < bits; b += 1) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
  return r;
});

function spectrum(start) {
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N; i += 1) re[reversed[i]] = samples[start + i] * hann[i];
  for (let size = 2; size <= N; size *= 2) {
    const half = size / 2;
    const step = (-2 * Math.PI) / size;
    for (let s = 0; s < N; s += size) {
      for (let k = 0; k < half; k += 1) {
        const c = Math.cos(step * k);
        const d = Math.sin(step * k);
        const a = s + k;
        const b = a + half;
        const tr = re[b] * c - im[b] * d;
        const ti = re[b] * d + im[b] * c;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
  return Float64Array.from({ length: N / 2 }, (_, i) => Math.hypot(re[i], im[i]));
}

const width = Math.floor((samples.length - N) / hop);
const height = 96;
const low = 70;
const high = 5400;
const edges = Array.from({ length: height + 1 }, (_, r) => low * (high / low) ** (r / height));
const levels = new Float32Array(width * height);

for (let x = 0; x < width; x += 1) {
  const mag = spectrum(x * hop);
  for (let r = 0; r < height; r += 1) {
    const a = Math.max(1, Math.floor((edges[r] * N) / rate));
    const b = Math.max(a + 1, Math.ceil((edges[r + 1] * N) / rate));
    let sum = 0;
    for (let k = a; k < b; k += 1) sum += mag[k];
    levels[x * height + r] = 20 * Math.log10(sum / (b - a) + 1e-7);
  }
}

const sorted = Float32Array.from(levels).sort();
const top = sorted[Math.floor(sorted.length * 0.995)];
const range = 44;
const image = Buffer.alloc(width * height * 4);

for (let x = 0; x < width; x += 1) {
  for (let r = 0; r < height; r += 1) {
    const span = [-1, 0, 1].filter((d) => x + d >= 0 && x + d < width);
    const level = span.reduce((sum, d) => sum + levels[(x + d) * height + r], 0) / span.length;
    const ink = Math.max(0, Math.min(1, (level - top + range) / range)) ** 1.7;
    const fade = 1 - 0.62 * (r / (height - 1));
    const at = (r * width + (width - 1 - x)) * 4;
    image[at] = 23;
    image[at + 1] = 23;
    image[at + 2] = 28;
    image[at + 3] = Math.round(255 * ink * fade);
  }
}

await sharp(image, { raw: { width, height, channels: 4 } })
  .webp({ quality: 80, alphaQuality: 82 })
  .toFile('public/shadow.webp');
console.log(`public/shadow.webp ${width}x${height}, ${((samples.length / rate)).toFixed(2)} s`);
