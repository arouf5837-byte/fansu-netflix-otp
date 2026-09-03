import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:xZ7VPwq4Z-9a2Y-@db.atzbqvxvlydenkoyokvc.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function fixRls() {
  await client.connect();
  console.log('Connected to Supabase DB...');

  // Allow public select on client_keys and netflix_accounts so client portal can verify their key
  await client.query(`
    DROP POLICY IF EXISTS "Allow public select on client_keys" ON client_keys;
    CREATE POLICY "Allow public select on client_keys" ON client_keys FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow public select on netflix_accounts" ON netflix_accounts;
    CREATE POLICY "Allow public select on netflix_accounts" ON netflix_accounts FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow public select on otp_logs" ON otp_logs;
    CREATE POLICY "Allow public select on otp_logs" ON otp_logs FOR SELECT USING (true);
  `);

  console.log('✅ RLS Policies updated to allow public select!');

  // Check client_keys content
  const res = await client.query('SELECT * FROM client_keys;');
  console.log('Client Keys in DB:', res.rows);

  await client.end();
}

fixRls().catch(err => console.error(err));
