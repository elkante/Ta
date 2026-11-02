/**
 * Cryptographic security utilities for Tá.shop platform.
 * Implements native Web Crypto API (PBKDF2 with SHA-256 and salt) for zero-plaintext password storage.
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

/**
 * Converts an ArrayBuffer to a hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Converts a hex string back to a Uint8Array buffer.
 */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Hashes a plaintext password using PBKDF2 with SHA-256 and a random 16-byte salt.
 * Output format: `pbkdf2:sha256:<iterations>:<salt_hex>:<hash_hex>`
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Generate random salt
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);

  // Import raw key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BYTES * 8
  );

  const saltHex = bufferToHex(salt.buffer);
  const hashHex = bufferToHex(derivedBits);

  return `pbkdf2:sha256:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Checks if a stored password string is already in the PBKDF2 hashed format.
 */
export function isHashedPassword(storedPassword?: string): boolean {
  if (!storedPassword) return false;
  return storedPassword.startsWith('pbkdf2:sha256:');
}

/**
 * Verifies a plaintext password against a stored hash (or legacy plaintext password).
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(
  attemptPassword: string,
  storedPassword?: string
): Promise<boolean> {
  if (!storedPassword || !attemptPassword) return false;

  // 1. Check if stored password is in PBKDF2 hashed format
  if (isHashedPassword(storedPassword)) {
    const parts = storedPassword.split(':');
    if (parts.length !== 5) return false;

    const iterations = parseInt(parts[2], 10);
    const salt = hexToBuffer(parts[3]);
    const originalHashHex = parts[4];

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(attemptPassword),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations: isNaN(iterations) ? PBKDF2_ITERATIONS : iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      HASH_BYTES * 8
    );

    const attemptHashHex = bufferToHex(derivedBits);

    // Constant-time string comparison
    if (attemptHashHex.length !== originalHashHex.length) return false;
    let diff = 0;
    for (let i = 0; i < attemptHashHex.length; i++) {
      diff |= attemptHashHex.charCodeAt(i) ^ originalHashHex.charCodeAt(i);
    }
    return diff === 0;
  }

  // 2. Fallback for legacy unhashed passwords
  return attemptPassword === storedPassword;
}
