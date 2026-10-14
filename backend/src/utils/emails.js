import { sendMail } from './mailer.js';
import { renderEmail, toPlainText, escapeHtml, nl2p } from './emailTemplate.js';

const numberFormat = new Intl.NumberFormat('en-US');
const formatPrice = (value) => `${numberFormat.format(value)} RWF`;

function clientUrl(path = '') {
  const base = (process.env.CLIENT_URL || 'https://sheshapeactive.com').replace(/\/$/, '');
  return `${base}${path}`;
}

async function dispatch({ to, subject, eyebrow, title, bodyHtml, ctaLabel, ctaUrl, preheader }) {
  const html = renderEmail({ preheader: preheader || subject, eyebrow, title, bodyHtml, ctaLabel, ctaUrl });

  await sendMail({ to, subject, html, text: toPlainText(bodyHtml) });
}

// ---------------------------------------------------------------------------
// OTP (email verification / password reset)
// ---------------------------------------------------------------------------

const OTP_COPY = {
  verify_email: {
    subject: 'Verify your She Shape account',
    eyebrow: 'Confirm your email',
    title: "You're almost in",
    intro: 'Use this code to verify your email address and finish setting up your account.',
  },
  reset_password: {
    subject: 'Reset your She Shape password',
    eyebrow: 'Password reset',
    title: 'Reset your password',
    intro: "Use this code to reset your password. If you didn't request this, you can safely ignore this email.",
  },
};

export async function sendOtpEmail({ to, purpose, code, expiresMinutes }) {
  const copy = OTP_COPY[purpose] ?? OTP_COPY.verify_email;

  const bodyHtml = `
    <p style="margin:0 0 20px;">${escapeHtml(copy.intro)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
      <tr>
        <td style="background:#f2f6f2;border:1.5px solid #2f6b3d33;border-radius:12px;padding:16px 28px;">
          <span style="font-family:Georgia,serif;font-size:32px;font-weight:700;letter-spacing:10px;color:#06311a;">${escapeHtml(code)}</span>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#3a4740;">This code expires in ${expiresMinutes} minutes.</p>`;

  await dispatch({
    to,
    subject: copy.subject,
    eyebrow: copy.eyebrow,
    title: copy.title,
    bodyHtml,
    preheader: `Your code: ${code}`,
  });
}

// ---------------------------------------------------------------------------
// Contact form → admin notification
// ---------------------------------------------------------------------------

export async function sendContactNotificationEmail({ to, name, email, message, messageId }) {
  const bodyHtml = `
    <p style="margin:0 0 6px;"><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e7e9e0;">${nl2p(message)}</div>`;

  await dispatch({
    to,
    subject: `New contact message from ${name}`,
    eyebrow: 'Contact form',
    title: 'New message from your website',
    bodyHtml,
    ctaLabel: messageId ? 'View & reply' : 'Reply by email',
    ctaUrl: messageId ? clientUrl(`/admin/messages/${messageId}`) : `mailto:${email}`,
  });
}

export async function sendContactReplyEmail({ to, name, originalMessage, reply }) {
  const bodyHtml = `
    <p style="margin:0 0 18px;">Thanks for reaching out — here's our reply:</p>
    <div style="padding:14px 16px;background:#f2f6f2;border-radius:12px;margin-bottom:20px;">${nl2p(reply)}</div>
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#3a4740;">Your original message</p>
    <div style="padding:14px 16px;border:1px solid #e7e9e0;border-radius:12px;color:#3a4740;font-size:13.5px;">${nl2p(originalMessage)}</div>`;

  await dispatch({
    to,
    subject: 'She Shape replied to your message',
    eyebrow: 'Reply from She Shape',
    title: `Hi ${name}, we replied`,
    bodyHtml,
  });
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

function itemsTable(items) {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:9px 0;border-bottom:1px solid #e7e9e0;font-size:14px;color:#1c2b22;">${escapeHtml(item.name)} × ${item.quantity}</td>
          <td align="right" style="padding:9px 0;border-bottom:1px solid #e7e9e0;font-size:14px;color:#1c2b22;white-space:nowrap;">${formatPrice(item.price * item.quantity)}</td>
        </tr>`
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;border-collapse:collapse;">
      ${rows}
    </table>`;
}

export async function sendOrderConfirmationEmail({ to, order }) {
  const paymentLine =
    order.paymentMethod === 'card'
      ? "We're confirming your card payment now — you'll get another email once it clears."
      : "Pay in cash when your order arrives. We'll call you on the number you gave us to confirm details.";

  const bodyHtml = `
    <p style="margin:0 0 6px;">Hi ${escapeHtml(order.customerName)},</p>
    <p style="margin:0 0 18px;">Thanks for shopping with us — we've received order <strong>${escapeHtml(order.orderNumber)}</strong>.</p>
    ${itemsTable(order.items)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:-10px;">
      <tr>
        <td style="font-weight:700;font-size:15px;color:#06311a;">Total</td>
        <td align="right" style="font-weight:700;font-size:15px;color:#06311a;">${formatPrice(order.total)}</td>
      </tr>
    </table>
    <p style="margin:18px 0 0;font-size:13.5px;color:#3a4740;">Delivering to: ${escapeHtml(order.address)}</p>
    <p style="margin:14px 0 0;padding:14px 16px;background:#f2f6f2;border-radius:12px;font-size:13.5px;color:#1c2b22;">${escapeHtml(paymentLine)}</p>`;

  await dispatch({
    to,
    subject: `Order confirmed — ${order.orderNumber}`,
    eyebrow: 'Order received',
    title: 'Thank you for your order',
    bodyHtml,
    ctaLabel: 'View your order',
    ctaUrl: clientUrl(`/dashboard/order/${order.orderNumber}`),
    preheader: `Order ${order.orderNumber} — ${formatPrice(order.total)}`,
  });
}

const STATUS_COPY = {
  paid: {
    subject: (n) => `Payment received — ${n}`,
    eyebrow: 'Payment confirmed',
    title: 'We have your payment',
    message: 'Your payment came through. Your order is being prepared.',
  },
  shipped: {
    subject: (n) => `Your order is on its way — ${n}`,
    eyebrow: 'Order shipped',
    title: "It's on its way",
    message: "Your order has left us. We'll call you when it arrives.",
  },
  delivered: {
    subject: (n) => `Delivered — ${n}`,
    eyebrow: 'Order delivered',
    title: 'Delivered!',
    message: 'Your order has been delivered. Thank you for shopping with She Shape.',
  },
  cancelled: {
    subject: (n) => `Order cancelled — ${n}`,
    eyebrow: 'Order cancelled',
    title: 'Your order was cancelled',
    message: "This order was cancelled and nothing is owed. Call us if this wasn't expected.",
  },
};

export async function sendOrderStatusEmail({ to, order, status }) {
  const copy = STATUS_COPY[status];
  if (!copy || !to) return;

  const bodyHtml = `
    <p style="margin:0 0 6px;">Hi ${escapeHtml(order.customerName)},</p>
    <p style="margin:0 0 18px;">${escapeHtml(copy.message)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;">
      <tr>
        <td style="padding:12px 16px;background:#f2f6f2;border-radius:12px;font-size:14px;color:#1c2b22;">
          Order <strong>${escapeHtml(order.orderNumber)}</strong> · ${formatPrice(order.total)}
        </td>
      </tr>
    </table>`;

  await dispatch({
    to,
    subject: copy.subject(order.orderNumber),
    eyebrow: copy.eyebrow,
    title: copy.title,
    bodyHtml,
    ctaLabel: 'View your order',
    ctaUrl: clientUrl(`/dashboard/order/${order.orderNumber}`),
  });
}

// ---------------------------------------------------------------------------
// New blog post → all verified customers
// ---------------------------------------------------------------------------

const BCC_CHUNK_SIZE = 40;

function chunk(list, size) {
  const chunks = [];
  for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size));
  return chunks;
}

export async function sendNewPostEmails({ post, recipients }) {
  if (!recipients?.length) return;

  const postUrl = clientUrl(`/blog/${post.slug}`);

  const bodyHtml = `
    <p style="margin:0 0 18px;">We just published something new on the She Shape journal.</p>
    <h2 style="margin:0 0 10px;font-family:Georgia,'Playfair Display',serif;font-size:19px;color:#06311a;">${escapeHtml(post.title)}</h2>
    ${post.excerpt ? `<p style="margin:0;color:#3a4740;">${escapeHtml(post.excerpt)}</p>` : ''}`;

  const html = renderEmail({
    preheader: post.title,
    eyebrow: 'New on the journal',
    title: 'New blog post published',
    bodyHtml,
    ctaLabel: 'Read the post',
    ctaUrl: postUrl,
  });

  const text = toPlainText(bodyHtml);
  const from = `${post.title} — read it at ${postUrl}`;

  for (const group of chunk(recipients, BCC_CHUNK_SIZE)) {
    try {
      await sendMail({
        to: process.env.MAIL_FROM_EMAIL || process.env.ADMIN_EMAIL,
        bcc: group,
        subject: `New on the journal: ${post.title}`,
        html,
        text: `${text}\n\n${from}`,
      });
    } catch (error) {
      console.error('[emails] Failed to send blog notification batch:', error.message);
    }
  }
}
