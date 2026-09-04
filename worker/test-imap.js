import { ImapFlow } from 'imapflow';

const client = new ImapFlow({
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: 'aranyanill584@gmail.com',
    pass: 'skyj tuqu ayoj jlvk'
  },
  logger: false
});

async function testGmail() {
  try {
    console.log('Connecting to Gmail IMAP with new password...');
    await client.connect();
    console.log('🎉 GMAIL IMAP CONNECTED SUCCESSFULLY!');

    const lock = await client.getMailboxLock('INBOX');
    try {
      console.log(`✅ INBOX Total Messages: ${client.mailbox.exists}`);
    } finally {
      lock.release();
    }

    await client.logout();
    console.log('✅ Logged out cleanly.');
  } catch (err) {
    console.error('❌ IMAP Error:', err.message);
  }
}

testGmail();
