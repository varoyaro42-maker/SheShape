import nodemailer from 'nodemailer';

/**
 * Outbound email. Three transports, picked in this order:
 *  1. Brevo HTTPS API when BREVO_API_KEY is set (recommended on shared hosting,
 *     where outbound SMTP ports are often blocked).
 *  2. Plain SMTP when SMTP_HOST is set (Brevo's relay also works here).
 *  3. The server's own sendmail when MAIL_TRANSPORT=sendmail (cPanel: sends
 *     as a local mailbox without storing its password in the app).
 *  4. Console, so development never needs credentials.
 */
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

let transporter = null;

/** Emails "sent" during tests, newest last. */
export const testOutbox = [];

function sender() {
  return {
    name: process.env.MAIL_FROM_NAME ?? 'She Shape Wellness',
    email: process.env.MAIL_FROM_EMAIL ?? 'no-reply@sheshape.local',
  };
}

function getSmtpTransporter() {
  if (process.env.MAIL_TRANSPORT === 'sendmail') {
    transporter ??= nodemailer.createTransport({ sendmail: true, newline: 'unix', path: process.env.SENDMAIL_PATH || '/usr/sbin/sendmail' });
    return transporter;
  }
  if (!process.env.SMTP_HOST) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  return transporter;
}

const toList = (value) =>
  (Array.isArray(value) ? value : String(value ?? '').split(','))
    .map((item) => String(item).trim())
    .filter(Boolean)
    .map((email) => ({ email }));

async function sendViaBrevo({ to, bcc, subject, html, text, replyTo }) {
  const body = {
    sender: sender(),
    to: toList(to),
    subject,
    htmlContent: html,
    textContent: text || undefined,
  };

  const bccList = toList(bcc);
  if (bccList.length) body.bcc = bccList;
  if (replyTo) body.replyTo = { email: replyTo };

  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Brevo rejected the email (${response.status}): ${detail.slice(0, 300)}`);
  }
}

export function emailTransport() {
  if (process.env.BREVO_API_KEY) return 'brevo';
  if (process.env.MAIL_TRANSPORT === 'sendmail' || process.env.SMTP_HOST) return 'smtp';
  return 'console';
}

export async function sendMail({ to, bcc, subject, html, text, replyTo }) {
  const transport = emailTransport();

  if (transport === 'brevo') {
    await sendViaBrevo({ to, bcc, subject, html, text, replyTo });
    return;
  }

  if (transport === 'smtp') {
    const { name, email } = sender();
    await getSmtpTransporter().sendMail({
      from: `${name} <${email}>`,
      to,
      bcc,
      subject,
      html,
      text,
      replyTo,
    });
    return;
  }

  if (process.env.NODE_ENV === 'test') {
    testOutbox.push({ to, subject, text, html });
    return;
  }
  {
    console.log(
      `[mailer] No email transport configured — printing instead.\nTo: ${to}\nBcc: ${bcc ?? '-'}\nSubject: ${subject}\n${text ?? html}`
    );
  }
}
