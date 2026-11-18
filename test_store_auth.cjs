const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  'https://ryatkftfeonmoyzcecza.supabase.co',
  'sb_publishable_NjvsPaI4L7QsvmhwdbpXqw_5OCTigL_'
);

async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  // If stored as plaintext:
  if (!storedHash.startsWith('pbkdf2:')) {
    return password === storedHash;
  }
  // PBKDF2 format: pbkdf2:sha256:iterations:saltHex:hashHex
  const parts = storedHash.split(':');
  if (parts.length !== 5) return false;
  const iterations = parseInt(parts[2], 10);
  const salt = Buffer.from(parts[3], 'hex');
  const expectedHash = parts[4];

  return new Promise((resolve) => {
    crypto.pbkdf2(password, salt, iterations, 32, 'sha256', (err, derivedKey) => {
      if (err) return resolve(false);
      resolve(derivedKey.toString('hex') === expectedHash);
    });
  });
}

async function checkStores() {
  const { data: stores, error } = await supabase.from('stores').select('*');
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Fetched ${stores.length} stores from Supabase:`);
  for (const s of stores) {
    console.log(`- ${s.name} (${s.slug}): email="${s.owner_email}", status="${s.status}", pwd_len=${s.owner_password ? s.owner_password.length : 0}, pwd_prefix=${s.owner_password ? s.owner_password.slice(0, 20) : 'none'}`);
  }
}

checkStores();
