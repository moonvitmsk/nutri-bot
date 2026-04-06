// Generate cosmic badge icons via DALL-E 3
// Run: npx tsx scripts/generate-badges.ts
import OpenAI from 'openai';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Load .env.local (has the keys)
for (const envFile of ['.env.local', '.env']) {
  const envPath = join(import.meta.dirname || '.', '..', envFile);
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
    }
  } catch { /* skip */ }
}

const openai = new OpenAI({ apiKey: process.argv[2] || process.env.OPENAI_API_KEY });

const BADGES = [
  { id: 'streak-3', prompt: 'A cute cartoon comet with a trail of 3 fire sparks, cosmic space background with stars, chibi kawaii style, vibrant purple and orange colors, round icon badge design, dark background' },
  { id: 'streak-7', prompt: 'A cartoon muscular astronaut flexing arms in space, cosmic nebula background, chibi kawaii style, vibrant purple and cyan colors, round icon badge design, dark background' },
  { id: 'streak-30', prompt: 'A golden trophy cup floating in space surrounded by stars and planets, cosmic style, chibi kawaii, vibrant gold and purple, round icon badge design, dark background' },
  { id: 'meals-10', prompt: 'A cute cartoon rocket ship shaped like a fork, flying through space with 10 stars trail, cosmic style, chibi kawaii, purple and pink, round icon badge design, dark background' },
  { id: 'meals-50', prompt: 'A cartoon open book with galaxy pages and stars flowing out, cosmic library in space, chibi kawaii style, purple and blue, round icon badge design, dark background' },
  { id: 'water-day', prompt: 'A cute cartoon water droplet wearing a space helmet, floating in space with bubbles and stars, cosmic style, chibi kawaii, blue and cyan, round icon badge design, dark background' },
  { id: 'photo-first', prompt: 'A cartoon camera floating in space taking photos of planets, cosmic style with lens flare, chibi kawaii, purple and green, round icon badge design, dark background' },
  { id: 'photo-10', prompt: 'A cartoon bullseye target on a planet surface with a rocket hitting center, cosmic style, chibi kawaii, red and purple, round icon badge design, dark background' },
];

const OUTPUT_DIR = join(import.meta.dirname || '.', '..', 'miniapp', 'public', 'badges');

async function generate() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const badge of BADGES) {
    console.log(`Generating ${badge.id}...`);
    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: badge.prompt + '. NO TEXT. NO LETTERS. NO WORDS. Clean icon only.',
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'b64_json',
      });

      const b64 = response.data[0].b64_json;
      if (b64) {
        const buffer = Buffer.from(b64, 'base64');
        const path = join(OUTPUT_DIR, `${badge.id}.png`);
        writeFileSync(path, buffer);
        console.log(`  Saved: ${path} (${Math.round(buffer.length / 1024)}KB)`);
      }
    } catch (err: any) {
      console.error(`  Error: ${err.message}`);
    }
  }
  console.log('Done!');
}

generate();
