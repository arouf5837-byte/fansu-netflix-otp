import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:xZ7VPwq4Z-9a2Y-@db.atzbqvxvlydenkoyokvc.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function getJwtSecret() {
  await client.connect();
  
  // Try querying settings or vault
  try {
    const res = await client.query(`
      SELECT name, setting 
      FROM pg_settings 
      WHERE name LIKE '%jwt%' OR name LIKE '%secret%' OR name LIKE '%anon%';
    `);
    console.log('PG Settings:', res.rows);
  } catch (e) {
    console.log('Error pg_settings:', e.message);
  }

  // Check vault / auth tables
  try {
    const res2 = await client.query(`
      SELECT * FROM vault.decrypted_secrets;
    `);
    console.log('Vault decrypted secrets:', res2.rows);
  } catch (e) {
    console.log('Error vault:', e.message);
  }

  await client.end();
}

getJwtSecret();
