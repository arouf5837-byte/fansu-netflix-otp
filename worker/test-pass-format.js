import { ImapFlow } from 'imapflow';

async function testWithPassword(pass, desc) {
  console.log(`\nTesting with: ${desc} ("${pass}")...`);
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: 'aranyanill584@gmail.com',
      pass: pass
    },
    logger: false
  });

  try {
    await client.connect();
    console.log(`✅ SUCCESS with ${desc}!`);
    await client.logout();
    return true;
  } catch (err) {
    console.log(`❌ Failed with ${desc}:`, err.message);
    return false;
  }
}

async function run() {
  await testWithPassword('fivm bhok sqhm zurr', 'with spaces');
  await testWithPassword('fivmbhoksqhmzurr', 'without spaces');
}

run();
