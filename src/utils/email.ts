/**
 * email.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tá.shop transactional email utility.
 *
 * Sends emails via Resend (https://resend.com) — simple REST API, works
 * from any environment (browser fetch, Node, Deno edge functions).
 *
 * To activate: add  VITE_RESEND_API_KEY=re_xxxxxxxxxxxx  to your .env file.
 * Leave it blank in development to skip sending (silent no-op).
 *
 * From address: Set VITE_EMAIL_FROM or defaults to onboarding@tashop.co
 * (you must verify this domain in Resend dashboard once you have your API key).
 */

const RESEND_API_KEY =
  (import.meta as any).env?.VITE_RESEND_API_KEY ?? '';

const FROM_ADDRESS =
  (import.meta as any).env?.VITE_EMAIL_FROM ?? 'Tá.shop <onboarding@tashop.co>';

/** Raw Resend send — returns true on success */
async function sendViaResend(payload: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.info('[email] No RESEND_API_KEY set — skipping email send.');
    return true; // silent no-op in dev
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...payload, from: FROM_ADDRESS }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[email] Resend error:', err);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[email] fetch error:', e);
    return false;
  }
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

interface WelcomeEmailParams {
  ownerName: string;
  storeName: string;
  storeSlug: string;
  storeUrl: string;
  toEmail: string;
  logoUrl?: string;
}

/**
 * sendWelcomeEmail — fired once after a new store is successfully created.
 * Pure welcome message, no confirmation link required.
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
  const { ownerName, storeName, storeSlug, storeUrl, toEmail, logoUrl } = params;

  const firstName = ownerName.split(' ')[0] || ownerName;

  const html = buildWelcomeHtml({ firstName, storeName, storeSlug, storeUrl, logoUrl });
  const text = buildWelcomeText({ firstName, storeName, storeSlug, storeUrl });

  return sendViaResend({
    from: FROM_ADDRESS,
    to: [toEmail],
    subject: `Welcome to Tá.shop, ${firstName}! Your store is live 🎉`,
    html,
    text,
  });
}

// ─── HTML Template ────────────────────────────────────────────────────────────

function buildWelcomeHtml(p: {
  firstName: string;
  storeName: string;
  storeSlug: string;
  storeUrl: string;
  logoUrl?: string;
}): string {
  const { firstName, storeName, storeUrl } = p;

  // Logo: if the store has a custom logo use it, otherwise use the Tá.shop wordmark SVG
  // The SVG is inlined so it renders on any background / email client
  const logoBlock = p.logoUrl
    ? `<img src="${p.logoUrl}" alt="${storeName} logo" width="56" height="56"
          style="border-radius:14px;object-fit:cover;display:block;" />`
    : `<!-- Tá.shop wordmark SVG (renders on any background) -->
       <svg xmlns="http://www.w3.org/2000/svg" width="120" height="36" viewBox="0 0 120 36" fill="none">
         <rect width="120" height="36" rx="8" fill="#0f172a"/>
         <text x="12" y="25" font-family="Georgia,serif" font-size="20" font-weight="700" fill="#f8fafc">Tá</text>
         <text x="34" y="25" font-family="Georgia,serif" font-size="20" font-weight="400" fill="#94a3b8">.</text>
         <text x="40" y="25" font-family="Georgia,serif" font-size="20" font-weight="700" fill="#f8fafc">shop</text>
       </svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Welcome to Tá.shop</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">

        <!-- ── Header band ──────────────────────────────────────── -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%);padding:36px 32px 28px;text-align:center;">
            ${logoBlock}
            <p style="margin:16px 0 0;font-size:13px;font-weight:600;letter-spacing:0.08em;color:#94a3b8;text-transform:uppercase;">
              Tá.shop — Sell Smarter
            </p>
          </td>
        </tr>

        <!-- ── Greeting ─────────────────────────────────────────── -->
        <tr>
          <td style="padding:40px 36px 0;">
            <h1 style="margin:0;font-size:26px;font-weight:800;color:#0f172a;line-height:1.25;">
              Welcome, ${firstName}! 🎉
            </h1>
            <p style="margin:14px 0 0;font-size:16px;line-height:1.65;color:#475569;">
              Your store <strong style="color:#0f172a;">${storeName}</strong> is live and ready to take orders.
              Tá.shop connects your products directly to WhatsApp — customers click,
              you sell. No app downloads, no complexity.
            </p>
          </td>
        </tr>

        <!-- ── Divider ──────────────────────────────────────────── -->
        <tr><td style="padding:28px 36px 0;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>

        <!-- ── Quick steps ──────────────────────────────────────── -->
        <tr>
          <td style="padding:28px 36px 0;">
            <p style="margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:0.06em;color:#94a3b8;text-transform:uppercase;">
              Get started in 3 steps
            </p>

            <!-- Step 1 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
              <tr>
                <td width="40" valign="top">
                  <div style="width:32px;height:32px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#2563eb;text-align:center;line-height:32px;">1</div>
                </td>
                <td style="padding-left:12px;vertical-align:top;">
                  <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Add your products</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#64748b;line-height:1.5;">Upload photos, set prices, and go live in minutes.</p>
                </td>
              </tr>
            </table>

            <!-- Step 2 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
              <tr>
                <td width="40" valign="top">
                  <div style="width:32px;height:32px;border-radius:50%;background:#f0fdf4;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#16a34a;text-align:center;line-height:32px;">2</div>
                </td>
                <td style="padding-left:12px;vertical-align:top;">
                  <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Share your store link</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#64748b;line-height:1.5;">Post your unique link on Instagram, WhatsApp status, or anywhere your customers are.</p>
                </td>
              </tr>
            </table>

            <!-- Step 3 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="40" valign="top">
                  <div style="width:32px;height:32px;border-radius:50%;background:#fdf4ff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#9333ea;text-align:center;line-height:32px;">3</div>
                </td>
                <td style="padding-left:12px;vertical-align:top;">
                  <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Enable the AI bot</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#64748b;line-height:1.5;">Let Tá.shop auto-reply to orders on WhatsApp 24/7 — even while you sleep.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── CTA button ────────────────────────────────────────── -->
        <tr>
          <td style="padding:32px 36px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);box-shadow:0 4px 12px rgba(37,99,235,0.35);">
                  <a href="${storeUrl}"
                     target="_blank"
                     style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                    Open My Store Dashboard →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0;font-size:13px;color:#94a3b8;">
              Your store link: <a href="${storeUrl}" style="color:#2563eb;text-decoration:none;">${storeUrl}</a>
            </p>
          </td>
        </tr>

        <!-- ── Footer ───────────────────────────────────────────── -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              You're receiving this because you just created a store on Tá.shop.<br/>
              Questions? Reply to this email — we're always happy to help.<br/>
              <span style="color:#cbd5e1;">© 2025 Tá.shop. Made with ❤️ in Nigeria.</span>
            </p>
          </td>
        </tr>

      </table>
      <!-- /card -->

    </td></tr>
  </table>

</body>
</html>`;
}

// ─── Plain-text fallback ──────────────────────────────────────────────────────

function buildWelcomeText(p: {
  firstName: string;
  storeName: string;
  storeSlug: string;
  storeUrl: string;
}): string {
  return `Welcome to Tá.shop, ${p.firstName}! 🎉

Your store "${p.storeName}" is now live and ready to take orders.

GET STARTED IN 3 STEPS:
1. Add your products — upload photos, set prices, go live in minutes.
2. Share your store link — post it anywhere your customers are.
3. Enable the AI bot — auto-reply to WhatsApp orders 24/7.

Open your store dashboard:
${p.storeUrl}

Questions? Just reply to this email.

© 2025 Tá.shop — Made with ❤️ in Nigeria.
`;
}
