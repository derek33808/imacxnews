import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadFrontend() {
  const fileUrl = pathToFileURL(path.join(__dirname, 'src/data/articles.js')).href;
  const mod = await import(fileUrl);
  return mod.initialArticlesData.map(a => ({ slug: a.slug, image: a.image }));
}

async function loadBackend() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query('SELECT slug, image, "imageAlt" FROM "Article" ORDER BY slug');
  await client.end();
  return res.rows;
}

function compare(front, back) {
  const frontMap = new Map(front.map(a => [a.slug, a]));
  const backMap = new Map(back.map(a => [a.slug, a]));

  const missingInDb = front.filter(a => !backMap.has(a.slug));
  const extraInDb = back.filter(b => !frontMap.has(b.slug));
  const imageDiffs = [];
  for (const a of front) {
    const b = backMap.get(a.slug);
    if (!b) continue;
    if ((a.image || '') !== (b.image || '')) {
      imageDiffs.push({ slug: a.slug, frontend: a.image, backend: b.image });
    }
  }
  const altMissing = back.filter(b => !b.imageAlt);

  return { missingInDb, extraInDb, imageDiffs, altMissing };
}

(async () => {
  const front = await loadFrontend();
  const back = await loadBackend();
  const result = compare(front, back);
  console.log('\n🧮 Compare result');
  console.log('Missing in DB:', result.missingInDb.map(i => i.slug));
  console.log('Extra in DB:', result.extraInDb.map(i => i.slug));
  console.log('Image diffs:', result.imageDiffs);
  console.log('Alt missing:', result.altMissing.map(i => i.slug));
})();
