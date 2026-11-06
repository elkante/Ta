// supabase/functions/send-welcome-email/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function — triggered by the client after new store creation.
// Sends a welcome email via Resend. The API key lives ONLY here (server-side),
// never exposed in the browser bundle.
//
// Deploy:
//   supabase functions deploy send-welcome-email --no-verify-jwt
//
// Set secrets (once):
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//   supabase secrets set EMAIL_FROM="Tá.shop <onboarding@tashop.co>"
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_ADDRESS   = Deno.env.get('EMAIL_FROM') ?? 'Tá.shop <onboarding@tashop.co>';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { ownerName, storeName, storeSlug, storeUrl, toEmail, logoUrl } =
      await req.json() as {
        ownerName: string;
        storeName: string;
        storeSlug: string;
        storeUrl: string;
        toEmail: string;
        logoUrl?: string;
      };

    if (!toEmail || !storeName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set — skipping email');
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const firstName = ownerName.split(' ')[0] || ownerName;
    const html = buildWelcomeHtml({ firstName, storeName, storeUrl, logoUrl });
    const text = buildWelcomeText({ firstName, storeName, storeUrl });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [toEmail],
        subject: `Welcome to Tá.shop, ${firstName}! Your store is live 🎉`,
        html,
        text,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Resend error:', data);
      return new Response(JSON.stringify({ error: data }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: (data as any).id }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

// ─── HTML template (same as client-side version) ─────────────────────────────

function buildWelcomeHtml(p: {
  firstName: string;
  storeName: string;
  storeUrl: string;
  logoUrl?: string;
}): string {
  const { firstName, storeName, storeUrl } = p;

  const logoBlock = p.logoUrl
    ? `<img src="${p.logoUrl}" alt="${storeName} logo" width="56" height="56" style="border-radius:14px;object-fit:cover;display:block;" />`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="36" viewBox="0 0 120 36" fill="none">
         <rect width="120" height="36" rx="8" fill="#0f172a"/>
         <text x="12" y="25" font-family="Georgia,serif" font-size="20" font-weight="700" fill="#f8fafc">Tá</text>
         <text x="34" y="25" font-family="Georgia,serif" font-size="20" font-weight="400" fill="#94a3b8">.</text>
         <text x="40" y="25" font-family="Georgia,serif" font-size="20" font-weight="700" fill="#f8fafc">shop</text>
       </svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Welcome to Tá.shop</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
    <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%);padding:36px 32px 28px;text-align:center;">
      ${logoBlock}
      <p style="margin:16px 0 0;font-size:13px;font-weight:600;letter-spacing:0.08em;color:#94a3b8;text-transform:uppercase;">Tá.shop — Sell Smarter</p>
    </td></tr>
    <tr><td style="padding:40px 36px 0;">
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#0f172a;line-height:1.25;">Welcome, ${firstName}! 🎉</h1>
      <p style="margin:14px 0 0;font-size:16px;line-height:1.65;color:#475569;">Your store <strong style="color:#0f172a;">${storeName}</strong> is live and ready to take orders. Tá.shop connects your products directly to WhatsApp — customers click, you sell.</p>
    </td></tr>
    <tr><td style="padding:28px 36px 0;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"/></td></tr>
    <tr><td style="padding:28px 36px 0;">
      <p style="margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:0.06em;color:#94a3b8;text-transform:uppercase;">Get started in 3 steps</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;"><tr>
        <td width="40" valign="top"><div style="width:32px;height:32px;border-radius:50%;background:#eff6ff;font-size:15px;font-weight:800;color:#2563eb;text-align:center;line-height:32px;">1</div></td>
        <td style="padding-left:12px;vertical-align:top;"><p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Add your products</p><p style="margin:4px 0 0;font-size:14px;color:#64748b;">Upload photos, set prices, go live in minutes.</p></td>
      </tr></table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;"><tr>
        <td width="40" valign="top"><div style="width:32px;height:32px;border-radius:50%;background:#f0fdf4;font-size:15px;font-weight:800;color:#16a34a;text-align:center;line-height:32px;">2</div></td>
        <td style="padding-left:12px;vertical-align:top;"><p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Share your store link</p><p style="margin:4px 0 0;font-size:14px;color:#64748b;">Post your unique link on Instagram, WhatsApp status, or anywhere your customers are.</p></td>
      </tr></table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="40" valign="top"><div style="width:32px;height:32px;border-radius:50%;background:#fdf4ff;font-size:15px;font-weight:800;color:#9333ea;text-align:center;line-height:32px;">3</div></td>
        <td style="padding-left:12px;vertical-align:top;"><p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Enable the AI bot</p><p style="margin:4px 0 0;font-size:14px;color:#64748b;">Let Tá.shop auto-reply to orders on WhatsApp 24/7 — even while you sleep.</p></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:32px 36px;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="border-radius:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);box-shadow:0 4px 12px rgba(37,99,235,0.35);">
          <a href="${storeUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Open My Store Dashboard →</a>
        </td>
      </tr></table>
      <p style="margin:14px 0 0;font-size:13px;color:#94a3b8;">Store link: <a href="${storeUrl}" style="color:#2563eb;text-decoration:none;">${storeUrl}</a></p>
    </td></tr>
    <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 36px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">You're receiving this because you just created a store on Tá.shop.<br/>Questions? Reply to this email — we're always happy to help.<br/><span style="color:#cbd5e1;">© 2025 Tá.shop. Made with ❤️ in Nigeria.</span></p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body></html>`;
}

function buildWelcomeText(p: { firstName: string; storeName: string; storeUrl: string }): string {
  return `Welcome to Tá.shop, ${p.firstName}! 🎉\n\nYour store "${p.storeName}" is now live.\n\nGet started:\n1. Add your products\n2. Share your store link\n3. Enable the AI WhatsApp bot\n\nOpen your dashboard: ${p.storeUrl}\n\nQuestions? Reply to this email.\n\n© 2025 Tá.shop — Made with ❤️ in Nigeria.`;
}
