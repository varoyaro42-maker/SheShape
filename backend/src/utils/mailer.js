import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
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

export async function sendMail({ to, bcc, subject, html, text }) {
  const from = `${process.env.MAIL_FROM_NAME ?? 'She Shape'} <${process.env.MAIL_FROM_EMAIL ?? 'no-reply@sheshape.local'}>`;
  const client = getTransporter();

  if (!client) {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[mailer] SMTP not configured — printing email instead.\nTo: ${to}\nBcc: ${bcc ?? '-'}\nSubject: ${subject}\n${text ?? html}`);
    }
    return;
  }

  await client.sendMail({ from, to, bcc, subject, html, text });
}
