const BRAND = {
  greenDark: '#06311a',
  greenMid: '#2f6b3d',
  greenLight: '#9ec6a6',
  bg: '#f6f6f3',
  cream: '#f4f1ea',
  white: '#ffffff',
  border: '#e7e9e0',
  text: '#1c2b22',
  textSoft: '#3a4740',
};

const FONT = "'Montserrat', Arial, sans-serif";
const FONT_HEADING = "Georgia, 'Playfair Display', serif";

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function nl2p(value) {
  return String(value ?? '')
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px;">${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function button(label, url) {
  if (!label || !url) return '';

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 6px;">
      <tr>
        <td style="border-radius:10px;background:${BRAND.greenDark};">
          <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * Shared branded shell every transactional/notification email is built on.
 * Table-based + inline styles throughout — the only layout that survives
 * Outlook's Word rendering engine and stripped <style> blocks in webmail.
 */
// Hosted on S3 (not the frontend build) so the logo renders in every email
// regardless of whether the frontend is deployed yet — see
// backend/src/scripts/uploadEmailLogo.js. A white-on-transparent variant,
// since it sits on the dark green header band below.
const DEFAULT_LOGO_URL = 'https://she-upgrade.s3.eu-north-1.amazonaws.com/email-assets/logo-light.svg';

export function renderEmail({ preheader = '', eyebrow = '', title, bodyHtml, ctaLabel, ctaUrl, footerNote }) {
  const logoUrl = process.env.EMAIL_LOGO_URL || DEFAULT_LOGO_URL;
  const year = new Date().getFullYear();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.bg};font-family:${FONT};">
    <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
            <tr>
              <td align="center" style="background:${BRAND.greenDark};border-radius:18px 18px 0 0;padding:26px 24px;">
                <img src="${logoUrl}" alt="She Shape" height="34" style="display:block;height:34px;width:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="background:${BRAND.white};border:1px solid ${BRAND.border};border-top:none;padding:36px 32px;">
                ${eyebrow ? `<p style="margin:0 0 10px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${BRAND.greenMid};">${escapeHtml(eyebrow)}</p>` : ''}
                <h1 style="margin:0 0 18px;font-family:${FONT_HEADING};font-size:24px;line-height:1.28;color:${BRAND.greenDark};">${escapeHtml(title)}</h1>
                <div style="font-family:${FONT};font-size:15px;line-height:1.65;color:${BRAND.text};">
                  ${bodyHtml}
                </div>
                ${button(ctaLabel, ctaUrl)}
              </td>
            </tr>
            <tr>
              <td style="background:${BRAND.cream};border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 18px 18px;padding:22px 32px;text-align:center;">
                <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;color:${BRAND.textSoft};">${escapeHtml(footerNote || 'She Shape · Kigali, Rwanda')}</p>
                <p style="margin:0;font-family:${FONT};font-size:11px;color:${BRAND.textSoft};">© ${year} She Shape. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function toPlainText(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h\d|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export { BRAND };
