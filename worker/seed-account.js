import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:xZ7VPwq4Z-9a2Y-@db.atzbqvxvlydenkoyokvc.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function seedData() {
  await client.connect();
  console.log('Connected to Supabase DB...');

  // 1. Insert or update Netflix account
  const accRes = await client.query(`
    INSERT INTO netflix_accounts (account_name, email, imap_host, imap_port, imap_user, imap_password, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, true)
    ON CONFLICT (email) DO UPDATE 
    SET account_name = EXCLUDED.account_name,
        imap_password = EXCLUDED.imap_password
    RETURNING id, email, account_name;
  `, [
    'Netflix Master Account',
    'aranyanill584@gmail.com',
    'imap.gmail.com',
    993,
    'aranyanill584@gmail.com',
    'fivmbhoksqhmzurr'
  ]);

  const accountId = accRes.rows[0].id;
  console.log('✅ Netflix Account recorded:', accRes.rows[0]);

  // 2. Insert test client key
  const clientRes = await client.query(`
    INSERT INTO client_keys (account_id, client_name, client_phone, access_key, valid_until, is_active, notes)
    VALUES ($1, $2, $3, $4, $5, true, $6)
    ON CONFLICT (access_key) DO UPDATE
    SET account_id = EXCLUDED.account_id,
        client_name = EXCLUDED.client_name
    RETURNING id, client_name, access_key;
  `, [
    accountId,
    'Tanvir Ahmed',
    '017xxxxxxxx',
    'NF-7821',
    new Date(Date.now() + 30 * 86400 * 1000), // 30 days
    '1-Screen 4K UHD'
  ]);

  console.log('✅ Client Access Key created:', clientRes.rows[0]);

  await client.end();
}

seedData().catch(err => console.error(err));
