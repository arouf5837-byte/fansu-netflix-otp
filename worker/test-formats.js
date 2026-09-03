import { ImapFlow } from 'imapflow';

async function testBoth() {
  const formats = [
    { name: 'With Spaces', pass: 'skyj tuqu ayoj jlvk' },
    { name: 'Without Spaces', pass: 'skyjtuquayojjlvk' },
    { name: 'Trimmed Upper', pass: 'SKYJTUQUAYOJJLVK' }
  ];

  for (const f of formats) {
    console.log(`Testing ${f.name}...`);
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: 'aranyanill584@gmail.com',
        pass: f.pass
      },
      logger: false
    });

    try {
      await client.connect();
      console.log(`✅ SUCCESS WITH ${f.name}!`);
      await client.logout();
      return f.pass;
    } catch (e) {
      console.log(`❌ Failed with ${f.name}:`, e.message);
    }
  }
}

testBoth();
