import { sendMail } from './mailer.js';
import { renderEmail, toPlainText, escapeHtml, nl2p } from './emailTemplate.js';
import { ticketRows, eventDate } from './ticketContent.js';

const numberFormat = new Intl.NumberFormat('en-US');
const formatPrice = (value) => `${numberFormat.format(value)} RWF`;

export function clientUrl(path = '') {
  const base = (process.env.CLIENT_URL || 'https://sheshapewellness.com').replace(/\/$/, '');
  return `${base}${path}`;
}

async function dispatch({ to, subject, eyebrow, title, bodyHtml, ctaLabel, ctaUrl, preheader, attachments }) {
  const html = renderEmail({ preheader: preheader || subject, eyebrow, title, bodyHtml, ctaLabel, ctaUrl });

  await sendMail({ to, subject, html, text: toPlainText(bodyHtml), attachments });
}

// ---------------------------------------------------------------------------
// OTP (email verification / password reset)
// ---------------------------------------------------------------------------

const OTP_COPY = {
  verify_email: {
    subject: 'Verify your She Shape Wellness account',
    eyebrow: 'Confirm your email',
    title: "You're almost in",
    intro: 'Use this code to verify your email address and finish setting up your account.',
  },
  reset_password: {
    subject: 'Reset your She Shape Wellness password',
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
    subject: 'She Shape Wellness replied to your message',
    eyebrow: 'Reply from She Shape Wellness',
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

function paymentInstructions(order, payment) {
  if (order.paymentMethod === 'momo' && order.paymentProvider === 'xentripay') {
    return `A payment prompt for <strong>${formatPrice(order.total)}</strong> was sent to <strong>${escapeHtml(order.customerPhone)}</strong>. Approve it on your phone to finish. If it did not appear, dial <strong>*182*7*1#</strong> on MTN to see pending approvals. You will get another email as soon as it clears.`;
  }

  if (order.paymentMethod === 'momo') {
    const momo = payment?.momo;
    const target = momo ? `<strong>${escapeHtml(momo.number)}</strong> (${escapeHtml(momo.name)})` : 'the MoMo number on our website';
    return `Send <strong>${formatPrice(order.total)}</strong> by MTN MoMo or Airtel Money to ${target}, using <strong>${escapeHtml(order.orderNumber)}</strong> as the reference. We confirm payment by hand, so allow a little time before the status updates.`;
  }

  if (order.paymentMethod === 'card') {
    return payment?.checkoutUrl
      ? `If you have not finished paying, you can <a href="${escapeHtml(payment.checkoutUrl)}" style="color:#2f6b3d;font-weight:700;">complete your card payment here</a>. You will get another email as soon as it clears.`
      : 'We are confirming your card payment now. You will get another email as soon as it clears.';
  }

  return "Pay in cash when your order arrives. We'll call you on the number you gave us to confirm details.";
}

export async function sendOrderConfirmationEmail({ to, order, payment }) {
  const paymentLine = paymentInstructions(order, payment);

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
    <p style="margin:14px 0 0;padding:14px 16px;background:#f2f6f2;border-radius:12px;font-size:13.5px;color:#1c2b22;">${paymentLine}</p>`;

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
    message: 'Your order has been delivered. Thank you for shopping with She Shape Wellness.',
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
    <p style="margin:0 0 18px;">We just published something new on the She Shape Wellness journal.</p>
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

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

export async function sendNewsletterConfirmEmail({ to, name, confirmUrl }) {
  const bodyHtml = `
    <p style="margin:0 0 14px;">${name ? `Hi ${escapeHtml(name)},` : 'Hi,'}</p>
    <p style="margin:0 0 14px;">Tap the button below to confirm you want tips, workouts and early access to new She Shape Wellness programs in your inbox.</p>
    <p style="margin:0;font-size:13px;color:#3a4740;">If you did not ask for this, ignore this email and nothing will be sent.</p>`;

  await dispatch({
    to,
    subject: 'Confirm your She Shape Wellness subscription',
    eyebrow: 'One more step',
    title: 'Confirm your email',
    bodyHtml,
    ctaLabel: 'Yes, subscribe me',
    ctaUrl: confirmUrl,
    preheader: 'Confirm to join the She Shape Wellness newsletter',
  });
}

// ---------------------------------------------------------------------------
// Program bookings
// ---------------------------------------------------------------------------

function bookingSummary(booking) {
  const rows = [
    ['Program', booking.programName],
    booking.preferredDate ? ['Preferred start', booking.preferredDate] : null,
    ['Phone', booking.phone],
  ].filter(Boolean);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0 0;border-collapse:collapse;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding:6px 18px 6px 0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#3a4740;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;font-size:14px;color:#1c2b22;">${escapeHtml(value)}</td>
        </tr>`
        )
        .join('')}
    </table>`;
}

export async function sendBookingReceivedEmail({ to, booking }) {
  const bodyHtml = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(booking.name)},</p>
    <p style="margin:0;">Thanks for asking to join <strong>${escapeHtml(booking.programName)}</strong>. A coach will look at your request and reply by email or phone, usually within one business day.</p>
    ${bookingSummary(booking)}`;

  await dispatch({
    to,
    subject: `We got your request: ${booking.programName}`,
    eyebrow: 'Request received',
    title: "You're on the list",
    bodyHtml,
    preheader: `Your request to join ${booking.programName}`,
  });
}

export async function sendBookingNotificationEmail({ to, booking }) {
  const bodyHtml = `
    <p style="margin:0 0 6px;"><strong>${escapeHtml(booking.name)}</strong> (${escapeHtml(booking.email)}) wants to join <strong>${escapeHtml(booking.programName)}</strong>.</p>
    ${bookingSummary(booking)}
    ${booking.message ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid #e7e9e0;">${nl2p(booking.message)}</div>` : ''}`;

  await dispatch({
    to,
    subject: `New booking request: ${booking.programName}`,
    eyebrow: 'Booking request',
    title: `${booking.name} wants to join`,
    bodyHtml,
    ctaLabel: 'Open in admin',
    ctaUrl: clientUrl(`/admin/bookings/${booking.id}`),
  });
}

const BOOKING_COPY = {
  confirmed: {
    subject: (name) => `You're in: ${name}`,
    eyebrow: 'Booking confirmed',
    title: 'See you at training',
    intro: (name) => `Your place in <strong>${escapeHtml(name)}</strong> is confirmed.`,
  },
  declined: {
    subject: (name) => `About your request: ${name}`,
    eyebrow: 'Booking update',
    title: "We couldn't fit this one",
    intro: (name) => `We could not confirm your request for <strong>${escapeHtml(name)}</strong> this time.`,
  },
};

export async function sendBookingStatusEmail({ to, booking, status, note }) {
  const copy = BOOKING_COPY[status];
  if (!copy || !to) return;

  const bodyHtml = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(booking.name)},</p>
    <p style="margin:0 0 14px;">${copy.intro(booking.programName)}</p>
    ${note ? `<div style="padding:14px 16px;background:#f2f6f2;border-radius:12px;">${nl2p(note)}</div>` : ''}
    ${bookingSummary(booking)}`;

  await dispatch({
    to,
    subject: copy.subject(booking.programName),
    eyebrow: copy.eyebrow,
    title: copy.title,
    bodyHtml,
    ctaLabel: 'See all programs',
    ctaUrl: clientUrl('/programs'),
  });
}

// ---------------------------------------------------------------------------
// Admin invites
// ---------------------------------------------------------------------------

export async function sendAdminInviteEmail({ to, name, invitedBy, acceptUrl, expiresDays }) {
  const bodyHtml = `
    <p style="margin:0 0 14px;">${name ? `Hi ${escapeHtml(name)},` : 'Hi,'}</p>
    <p style="margin:0 0 14px;">${invitedBy ? escapeHtml(invitedBy) : 'The She Shape Wellness team'} invited you to help run the She Shape Wellness website as an admin: programs, the shop, orders, bookings, the blog and site content.</p>
    <p style="margin:0 0 14px;">Tap the button to set your password and get started. The link works once and expires in ${expiresDays} days.</p>
    <p style="margin:0;font-size:13px;color:#3a4740;">If you were not expecting this, ignore this email.</p>`;

  await dispatch({
    to,
    subject: "You're invited to the She Shape Wellness admin",
    eyebrow: 'Admin invite',
    title: 'Join the She Shape Wellness team',
    bodyHtml,
    ctaLabel: 'Accept the invite',
    ctaUrl: acceptUrl,
    preheader: 'Set your password to start managing She Shape Wellness',
  });
}

// ---------------------------------------------------------------------------
// Event tickets: one email that is both the receipt and the ticket. Nothing medical.
// ---------------------------------------------------------------------------

export async function sendEventTicketEmail({ to, ticket, qrImageUrl, ticketUrl, pdf }) {
  const e = ticket.event;
  const show = ticket.show ?? {};
  const rows = ticketRows(ticket, { includeHeader: true });
  const cell = 'padding:10px 0;border-top:1px solid #e7e9e0;vertical-align:top;';

  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${escapeHtml(ticket.name.split(' ')[0])}, your place at ${escapeHtml(e.title)} is confirmed. ${pdf ? 'Your ticket is attached as a PDF: save it to your phone.' : 'This email is your ticket.'}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border:1px solid #dfe4dc;border-radius:14px;overflow:hidden;margin:0 0 18px;">
      <tr>
        <td style="background:#14402a;padding:18px 20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9ec6a6;">Ticket</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">${escapeHtml(ticket.ticketNumber)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 20px 4px;background:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
            ${rows.map((r, i) => `<tr><td style="${i ? cell : cell.replace('border-top:1px solid #e7e9e0;', '')}width:38%;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#2f6b3d;">${escapeHtml(r.label)}</td><td style="${i ? cell : cell.replace('border-top:1px solid #e7e9e0;', '')}font-size:14px;color:#1c2b22;">${escapeHtml(r.value)}</td></tr>`).join('')}
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:16px 20px 20px;background:#f4f1ea;">
          <img src="${qrImageUrl}" alt="Ticket ${escapeHtml(ticket.ticketNumber)}" width="170" height="170" style="display:block;width:170px;height:170px;border:0;margin:0 auto 8px;" />
          <p style="margin:0;font-size:12px;color:#3a4740;">Show this code at the entrance. One ticket admits one person.</p>
        </td>
      </tr>
    </table>
    ${show.dressCode && e.dressCode ? `<p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#2f6b3d;">Dress code</p><p style="margin:0 0 14px;">${escapeHtml(e.dressCode)}</p>` : ''}
    ${show.note && e.ticketNote ? nl2p(e.ticketNote) : ''}
    ${show.contact && e.contactWhatsapp ? `<p style="margin:14px 0 0;font-size:13px;color:#3a4740;">Questions: WhatsApp ${escapeHtml(e.contactWhatsapp)}</p>` : ''}`;

  await dispatch({
    to,
    subject: `Your ticket: ${e.title} (${ticket.ticketNumber})`,
    eyebrow: 'Your ticket',
    title: e.title,
    bodyHtml,
    ctaLabel: pdf ? 'Download my ticket (PDF)' : 'Open my ticket',
    ctaUrl: pdf ? clientUrl(`/api/events/tickets/${ticket.token}/ticket.pdf`) : ticketUrl,
    preheader: `Ticket ${ticket.ticketNumber} · ${eventDate(e.date)}`,
    attachments: pdf ? [{ filename: `${e.slug}-${ticket.ticketNumber}.pdf`, content: pdf, contentType: 'application/pdf' }] : undefined,
  });
}

/** To the team, once, when the last place is taken. */
export async function sendEventFullEmail({ to, event, confirmed, activities, manageUrl }) {
  const bodyHtml = `
    <p style="margin:0 0 14px;">Every place for <strong>${escapeHtml(event.title)}</strong> (${escapeHtml(eventDate(event.date))}) is now taken: ${confirmed} of ${event.totalPlaces} confirmed.</p>
    <p style="margin:0 0 14px;">The event page now shows it as fully booked and registration is closed. To open more places, raise the total in the event's settings.</p>
    ${activities.length ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 14px;border-collapse:collapse;">${activities.map((a) => `<tr><td style="padding:5px 18px 5px 0;font-size:14px;color:#1c2b22;">${escapeHtml(a.name)}</td><td style="padding:5px 0;font-size:14px;color:#3a4740;">${a.taken} of ${a.places}${a.taken >= a.places ? ' · full' : ''}</td></tr>`).join('')}</table>` : ''}`;

  await dispatch({
    to: to.join(','),
    subject: `Fully booked: ${event.title}`,
    eyebrow: 'Sold out',
    title: `${event.title} is fully booked`,
    bodyHtml,
    ctaLabel: 'See the registrations',
    ctaUrl: manageUrl,
  });
}
