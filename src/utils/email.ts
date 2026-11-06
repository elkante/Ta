/**
 * email.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tá.shop transactional email utility — CLIENT-SIDE SAFE.
 *
 * All email sending is proxied through the Supabase Edge Function
 * `send-welcome-email` so that the Resend API key NEVER appears in the
 * browser bundle.
 *
 * The edge function URL is built from VITE_SUPABASE_URL (already in .env).
 * No extra secrets needed on the client.
 *
 * To activate:
 *   1. Deploy:  supabase functions deploy send-welcome-email --no-verify-jwt
 *   2. Set key: supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
 *   3. Set from: supabase secrets set EMAIL_FROM="Tá.shop <onboarding@tashop.co>"
 */

const SUPABASE_URL: string =
  (import.meta as any).env?.VITE_SUPABASE_URL ?? '';

const SUPABASE_ANON_KEY: string =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? '';

/** POST to a Supabase Edge Function by name */
async function callEdgeFunction(
  functionName: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (!SUPABASE_URL) {
    console.info('[email] VITE_SUPABASE_URL not set — skipping email.');
    return true;
  }
  try {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        // No Authorization header — edge function uses --no-verify-jwt
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[email] Edge function ${functionName} error:`, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[email] fetch error calling ${functionName}:`, e);
    return false;
  }
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

export interface WelcomeEmailParams {
  ownerName: string;
  storeName: string;
  storeSlug: string;
  storeUrl: string;
  toEmail: string;
  logoUrl?: string;
}

/**
 * sendWelcomeEmail — fired once after a new store is created.
 * Calls the `send-welcome-email` Supabase Edge Function (server-side).
 * API key stays safely on the server — never exposed to the browser.
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
  return callEdgeFunction('send-welcome-email', params);
}
