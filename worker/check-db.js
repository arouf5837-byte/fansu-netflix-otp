import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:xZ7VPwq4Z-9a2Y-@db.atzbqvxvlydenkoyokvc.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkDb() {
  await client.connect();
  console.log('✅ Connected to Supabase DB!');

  // Check tables
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `);
  console.log('Tables in database:', tables.rows.map(r => r.table_name));

  // Check if account already exists
  const accs = await client.query('SELECT id, email, account_name FROM netflix_accounts;');
  console.log('Netflix Accounts in DB:', accs.rows);

  await client.end();
}

checkDb().catch(err => console.error(err));
