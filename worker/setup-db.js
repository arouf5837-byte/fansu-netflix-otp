import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Direct / Pooler Connection String
// postgresql://postgres:[password]@db.atzbqvxvlydenkoyokvc.supabase.co:5432/postgres
// Or pooler: postgresql://postgres.atzbqvxvlydenkoyokvc:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

const connectionStrings = [
  'postgresql://postgres:xZ7VPwq4Z-9a2Y-@db.atzbqvxvlydenkoyokvc.supabase.co:5432/postgres',
  'postgresql://postgres.atzbqvxvlydenkoyokvc:xZ7VPwq4Z-9a2Y-@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres.atzbqvxvlydenkoyokvc:xZ7VPwq4Z-9a2Y-@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
];

async function runMigration() {
  const sqlPath = path.resolve(__dirname, '../supabase_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  for (const connStr of connectionStrings) {
    console.log(`Attempting connection to: ${connStr.replace(/:[^:@]+@/, ':***@')}...`);
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });

    try {
      await client.connect();
      console.log('✅ Connected to Supabase PostgreSQL database!');
      
      console.log('Executing supabase_schema.sql...');
      await client.query(sql);
      console.log('🎉 Schema applied successfully! Tables netflix_accounts, client_keys, otp_logs created.');
      
      await client.end();
      return;
    } catch (err) {
      console.log('Failed with connection string:', err.message);
      try { await client.end(); } catch (e) {}
    }
  }
}

runMigration();
