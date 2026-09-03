import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:xZ7VPwq4Z-9a2Y-@db.atzbqvxvlydenkoyokvc.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function cleanLogs() {
  await client.connect();
  console.log('Connected to Supabase DB...');

  // Keep only the single latest valid OTP for each account and delete older test duplicates
  await client.query(`
    DELETE FROM otp_logs 
    WHERE id NOT IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY received_at DESC) as rnk
        FROM otp_logs
      ) sub
      WHERE rnk <= 1
    );
  `);

  const res = await client.query('SELECT id, otp_code, received_at FROM otp_logs ORDER BY received_at DESC;');
  console.log('Cleaned OTP logs in Supabase (Only latest kept):', res.rows);

  await client.end();
}

cleanLogs().catch(err => console.error(err));
