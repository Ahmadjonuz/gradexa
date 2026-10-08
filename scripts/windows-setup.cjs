const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error('Node.js 22.13 yoki undan yangi versiya kerak. Node.js ni yangilang.');
  process.exit(1);
}

const mode = process.argv[2];
if (mode === '--node') {
  console.log(`Node.js ${process.versions.node} topildi.`);
  process.exit(0);
}

if (mode === '--bank-node') {
  const supportsProxy =
    major >= 25 ||
    (major === 24 && minor >= 5) ||
    (major === 22 && minor >= 21);
  if (!supportsProxy) {
    console.error(
      'Bank proksisi uchun Node.js 22.21+ yoki 24.5+ kerak. Node.js LTSni yangilang.',
    );
    process.exit(1);
  }
  console.log(`Node.js ${process.versions.node}: bank proksi rejimi mavjud.`);
  process.exit(0);
}

if (mode === '--prepare') {
  try {
    fs.copyFileSync(
      path.join(root, '.env.example'),
      path.join(root, '.env.local'),
      fs.constants.COPYFILE_EXCL,
    );
    console.log('.env.local yaratildi. Supabase qiymatlarini shu faylga kiriting.');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log('Mavjud .env.local saqlandi.');
  }
  process.exit(0);
}

function readConfig() {
  // Next.js ishlatadigan parser bilan o'qiymiz. Qiymatlarning o'zi chiqarilmaydi.
  require('@next/env').loadEnvConfig(root, true, { info() {}, error() {} });
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SITE_URL',
    'SUPABASE_SECRET_KEY',
  ];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    console.error('.env.local ichida quyidagi qiymatlarni kiriting: ' + missing.join(', '));
    process.exit(2);
  }

  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SITE_URL']) {
    try {
      const parsed = new URL(process.env[name]);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
    } catch {
      console.error('.env.local ichida manzil formati xato: ' + name);
      process.exit(2);
    }
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, ''),
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim(),
  };
}

if (mode === '--check') {
  readConfig();
  console.log('Mahalliy Supabase sozlamalari toliq kiritilgan.');
  process.exit(0);
}

if (mode === '--mark-installed') {
  fs.writeFileSync(
    path.join(root, '.gradexa-installed'),
    `Gradexa V2 verified ${new Date().toISOString()}\n`,
    { encoding: 'utf8', mode: 0o600 },
  );
  process.exit(0);
}

async function checkLiveSupabase() {
  const { url, key } = readConfig();
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  };

  let authResponse;
  try {
    authResponse = await fetch(`${url}/auth/v1/settings`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    console.error('Supabase serveriga ulanib bolmadi. Internet va Project URLni tekshiring.');
    process.exit(3);
  }
  if (!authResponse.ok) {
    console.error(`Supabase Auth tekshiruvi otmadi (HTTP ${authResponse.status}). URL va publishable keyni tekshiring.`);
    process.exit(3);
  }

  let coursesResponse;
  try {
    const columns = 'id,slug,title,language,sequential,cover_image';
    coursesResponse = await fetch(
      `${url}/rest/v1/courses?select=${encodeURIComponent(columns)}&limit=1`,
      { headers, signal: AbortSignal.timeout(15000) },
    );
  } catch {
    console.error('Supabase REST API bilan aloqa uzildi. Internetni tekshirib qayta urining.');
    process.exit(3);
  }

  if (!coursesResponse.ok) {
    const body = await coursesResponse.json().catch(() => ({}));
    if (body?.code === 'PGRST205' || body?.code === '42P01') {
      console.error('Tanlangan Supabase loyihasida courses jadvali topilmadi.');
      process.exit(5);
    }
    if (body?.code === 'PGRST204' || body?.code === '42703') {
      console.error('Courses jadvali bor, lekin kurslar yangilanishi SQLi hali qollanmagan.');
      process.exit(4);
    }
    console.error(`Courses API tekshiruvi otmadi (HTTP ${coursesResponse.status}). SQL, grant va RLSni tekshiring.`);
    process.exit(4);
  }

  console.log('Supabase Auth va courses jadvali bilan aloqa muvaffaqiyatli.');
}

if (mode === '--live') {
  checkLiveSupabase().catch(() => {
    console.error('Supabase tekshiruvida kutilmagan xato yuz berdi.');
    process.exit(3);
  });
} else if (!['--node', '--bank-node', '--prepare', '--check', '--mark-installed'].includes(mode)) {
  console.error('Nomalum tekshiruv parametri.');
  process.exit(1);
}
