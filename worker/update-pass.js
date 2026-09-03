import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:xZ7VPwq4Z-9a2Y-@db.atzbqvxvlydenkoyokvc.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function updatePassword() {
  await client.connect();
  console.log('Connected to DB...');

  const res = await client.query(`
    UPDATE netflix_accounts
    SET imap_password = $1,
        last_error = NULL
    WHERE email = $2
    RETURNING id, email, account_name;
  `, ['skyj tuqu ayoj jlvk', 'aranyanill584@gmail.com']);

  console.log('✅ Updated Netflix Account:', res.rows[0]);
  await client.end();
}

updatePassword().catch(err => console.error(err));
