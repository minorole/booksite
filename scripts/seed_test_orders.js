const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  // Extract PG env via `supabase db dump --dry-run`
  const { execSync } = require('child_process');
  const out = execSync('supabase db dump --dry-run 2>/dev/null').toString();
  const env = {};
  for (const line of out.split('\n')) {
    const m = line.match(/^export (PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)="(.+)"$/);
    if (m) env[m[1]] = m[2];
  }
  if (!env.PGHOST) throw new Error('Failed to parse PG env from supabase CLI');

  // Prefer SUPER_ADMIN seed to avoid auth schema permissions
  const sqlPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '0015_seed_orders_for_super_admin.sql',
  );
  let sql = fs.readFileSync(sqlPath, 'utf8');
  // Strip outer BEGIN/COMMIT to avoid nesting issues; run as single transaction
  sql = sql.replace(/\bBEGIN;?/gi, '').replace(/\bCOMMIT;?/gi, '');

  // Split on semicolons that end statements (naive but ok for our script)
  const statements = sql
    // Remove single-line comments
    .replace(/--.*$/gm, '')
    // Remove empty lines
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  const client = new Client({
    host: env.PGHOST,
    port: Number(env.PGPORT),
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt);
      } catch (e) {
        console.error(`Failed at statement ${i + 1}:`, stmt);
        throw e;
      }
    }
    await client.query('COMMIT');
    console.log('Seeding complete via CLI connection');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed error:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
