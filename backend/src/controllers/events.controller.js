import QRCode from 'qrcode';
import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { Event, EventRegistration, User, TICKET_FIELDS } from '../models/index.js';
import {
  loadEvent,
  publicEvent,
  readRegistrationInput,
  reservePlaces,
  confirmPayment,
  markPaymentFailed,
  expireHolds,
  usage,
  registrationState,
  registrationActivities,
} from '../utils/events.js';
import { getXentripayClient } from '../utils/payments/index.js';
import { sendEventTicketEmail, sendEventFullEmail, clientUrl } from '../utils/emails.js';
import { renderTicketPdf, storedTicketPdf } from '../utils/ticketPdf.js';
import { ticketPdfContent } from '../utils/ticketContent.js';

export const list = asyncHandler(async (req, res) => {
  const events = await Event.findAll({ where: { status: ['open', 'closed'] }, order: [['date', 'ASC']] });
  const data = [];
  for (const event of events) {
    const used = await usage(event.id);
    data.push({
      slug: event.slug,
      title: event.title,
      tagline: event.tagline,
      date: event.date,
      startTime: event.startTime,
      venue: event.venue,
      price: event.price,
      heroImage: event.heroImage,
      state: registrationState(event, used),
    });
  }
  res.json({ data });
});

async function findPublicEvent(slug) {
  const event = await loadEvent({ slug: String(slug ?? '').toLowerCase() });
  if (!event || event.status === 'draft') throw new HttpError(404, 'Event not found');
  return event;
}

export const detail = asyncHandler(async (req, res) => {
  const event = await findPublicEvent(req.params.slug);
  res.set('Cache-Control', 'no-store');
  res.json({ data: await publicEvent(event) });
});

/** The ticket she sees on the page and in the email. Nothing medical in here. */
async function ticketView(reg, event) {
  const acts = (await registrationActivities([reg.id]))[reg.id] ?? [];
  const fields = Array.isArray(event.ticketFields) ? event.ticketFields : TICKET_FIELDS;
  return {
    // What the admin chose to print on the ticket (page, PDF and email).
    show: Object.fromEntries(TICKET_FIELDS.map((f) => [f, fields.includes(f)])),
    token: reg.token,
    status: reg.status,
    ticketNumber: reg.ticketNumber,
    name: reg.name,
    email: reg.email,
    amount: reg.amount,
    paymentReference: reg.paymentReference,
    paymentMethod: reg.paymentMethod,
    paidAt: reg.paidAt,
    checkoutUrl: reg.status === 'holding' ? reg.paymentCheckoutUrl : null,
    holdExpiresAt: reg.holdExpiresAt,
    activities: acts.map((a) => a.name),
    qrUrl: reg.status === 'confirmed' ? `/api/events/tickets/${reg.token}/qr.png` : null,
    pdfUrl: reg.status === 'confirmed' ? `/api/events/tickets/${reg.token}/ticket.pdf` : null,
    event: {
      slug: event.slug,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      venue: event.venue,
      dressCode: event.dressCode,
      ticketNote: event.ticketNote,
      contactWhatsapp: event.contactWhatsapp,
    },
  };
}

/** The kept PDF for a confirmed registration (built on first ask, rebuilt after changes). */
async function ticketPdf(reg, event) {
  const view = await ticketView(reg, event);
  const changedAt = new Date(Math.max(new Date(reg.updatedAt), new Date(event.updatedAt)));
  return storedTicketPdf(reg.token, changedAt, () =>
    renderTicketPdf(ticketPdfContent(view, { qrText: clientUrl(`/admin/check-in/${reg.token}`), site: clientUrl('').replace(/^https?:\/\//, '') }))
  );
}

export async function sendTicket(reg) {
  if (reg.ticketEmailedAt || reg.status !== 'confirmed') return;
  const event = await Event.findByPk(reg.eventId);
  const view = await ticketView(reg, event);
  const pdf = await ticketPdf(reg, event).catch((error) => {
    console.error('[events] Ticket PDF failed for', reg.ticketNumber, error.message);
    return null;
  });
  await sendEventTicketEmail({
    to: reg.email,
    ticket: view,
    pdf,
    qrImageUrl: clientUrl(`/api/events/tickets/${reg.token}/qr.png`),
    ticketUrl: clientUrl(`/tickets/${reg.token}`),
  });
  reg.ticketEmailedAt = new Date();
  await reg.save();
}

export async function afterConfirmed(registrationId) {
  const reg = await EventRegistration.findByPk(registrationId);
  if (reg?.status === 'confirmed') {
    sendTicket(reg).catch((error) => console.error('[events] Ticket email failed for', reg.ticketNumber, error.message));
    checkFullyBooked(reg.eventId).catch((error) => console.error('[events] Full check failed', error.message));
  }
}

/**
 * Tells the team once when the last place (or an activity's last place) is
 * taken. Re-arms when an admin adds places, so a second sell-out is reported too.
 */
export async function checkFullyBooked(eventId) {
  const event = await loadEvent({ id: eventId });
  if (!event) return;
  const used = await usage(event.id);
  const full = used.confirmed >= event.totalPlaces;
  if (!full) {
    if (event.fullNotifiedAt) await Event.update({ fullNotifiedAt: null }, { where: { id: event.id } });
    return;
  }
  // Only the request that flips the flag sends the email.
  const [claimed] = await Event.update({ fullNotifiedAt: new Date() }, { where: { id: event.id, fullNotifiedAt: null } });
  if (!claimed) return;
  const recipients = await adminRecipients();
  if (!recipients.length) return;
  await sendEventFullEmail({
    to: recipients,
    event,
    confirmed: used.confirmed,
    activities: (event.activities ?? []).filter((a) => a.visible).map((a) => ({ name: a.name, places: a.places, taken: used.perActivity[a.id]?.confirmed ?? 0 })),
    manageUrl: clientUrl(`/admin/events/${event.id}/registrations`),
  });
}

async function adminRecipients() {
  const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['email'] });
  const list = [process.env.ADMIN_EMAIL, ...admins.map((a) => a.email)].map((e) => String(e ?? '').trim().toLowerCase()).filter(Boolean);
  return [...new Set(list)];
}

export const register = asyncHandler(async (req, res) => {
  const event = await findPublicEvent(req.params.slug);
  const paymentMethod = req.body?.paymentMethod === 'card' ? 'card' : 'momo';
  const free = event.price === 0;
  const input = readRegistrationInput(event, req.body, { requirePhonePattern: !free && paymentMethod === 'momo' });

  const client = free ? null : await getXentripayClient();
  if (!free && !client) throw new HttpError(503, 'Online payment is not available right now. Please contact us on WhatsApp.');

  const reg = await reservePlaces(event, input, { status: free ? 'confirmed' : 'holding', paymentMethod: free ? null : paymentMethod });

  if (free) {
    await afterConfirmed(reg.id);
    return res.status(201).json({ data: await ticketView(await reg.reload(), event) });
  }

  try {
    const ticketUrl = clientUrl(`/tickets/${reg.token}`);
    const collection = await client.initiateCollection({
      amount: event.price,
      reference: `EV-${reg.token.slice(0, 20)}`,
      description: `${event.title} ticket`,
      customer: { name: reg.name, email: reg.email, phone: reg.phone },
      method: paymentMethod,
      redirectUrl: ticketUrl,
      returnUrl: ticketUrl,
      chargesIncluded: event.feePaidBy === 'organiser',
    });
    reg.paymentReference = collection.reference;
    reg.paymentTransactionId = collection.transactionId;
    reg.paymentCheckoutUrl = collection.checkoutUrl;
    await reg.save();
  } catch (error) {
    console.error('[events] Could not start payment for', reg.id, error.message);
    await markPaymentFailed(reg.id);
    throw new HttpError(
      502,
      paymentMethod === 'momo'
        ? 'We could not send the payment prompt to that number. Check it is a mobile money number and try again.'
        : 'We could not start the card payment. Try again or pay with mobile money.'
    );
  }

  res.status(201).json({ data: await ticketView(reg, event) });
});

/** Polled by the page while she approves the payment. Also asks XentriPay directly. */
export const status = asyncHandler(async (req, res) => {
  let reg = await EventRegistration.findOne({ where: { token: String(req.params.token ?? '') } });
  if (!reg) throw new HttpError(404, 'Registration not found');

  if (['holding', 'expired'].includes(reg.status) && reg.paymentReference && !reg.paymentFailedAt) {
    const client = await getXentripayClient();
    const fresh = client ? await client.getCollectionStatus(reg.paymentReference).catch(() => null) : null;
    if (fresh?.status === 'paid') {
      const outcome = await confirmPayment(reg.id, { reference: reg.paymentReference });
      if (outcome === 'confirmed') await afterConfirmed(reg.id);
    } else if (fresh?.status === 'failed') {
      await markPaymentFailed(reg.id);
    }
  }
  await expireHolds({ eventId: reg.eventId });
  reg = await reg.reload();

  const event = await Event.findByPk(reg.eventId);
  res.set('Cache-Control', 'no-store');
  res.json({ data: await ticketView(reg, event) });
});

export const qr = asyncHandler(async (req, res) => {
  const reg = await EventRegistration.findOne({ where: { token: String(req.params.token ?? ''), status: 'confirmed' } });
  if (!reg) throw new HttpError(404, 'Ticket not found');
  const png = await QRCode.toBuffer(clientUrl(`/admin/check-in/${reg.token}`), { width: 360, margin: 1, color: { dark: '#14402A', light: '#FFFFFF' } });
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(png);
});

/** A sample ticket for the admin, with the event's saved settings and made-up guest details. */
export async function samplePdf(event) {
  const fields = Array.isArray(event.ticketFields) ? event.ticketFields : TICKET_FIELDS;
  const picks = (event.activities ?? []).filter((a) => a.visible).slice(0, Math.max(1, event.picks));
  const view = {
    show: Object.fromEntries(TICKET_FIELDS.map((f) => [f, fields.includes(f)])),
    ticketNumber: `${event.ticketPrefix}-0001`,
    name: 'Sample Guest',
    amount: event.price,
    paymentReference: 'EV-SAMPLE0000000000000',
    activities: picks.map((a) => a.name),
    event,
  };
  return renderTicketPdf(ticketPdfContent(view, { qrText: clientUrl('/admin/check-in/sample'), site: clientUrl('').replace(/^https?:\/\//, '') }));
}

/** The ticket as a PDF to download and keep. The token is the secret, as for the page. */
export const pdf = asyncHandler(async (req, res) => {
  const reg = await EventRegistration.findOne({ where: { token: String(req.params.token ?? ''), status: 'confirmed' } });
  if (!reg) throw new HttpError(404, 'Ticket not found');
  const event = await Event.findByPk(reg.eventId);
  const file = await ticketPdf(reg, event);
  const name = `${(event.slug || 'ticket').slice(0, 60)}-${reg.ticketNumber || 'ticket'}.pdf`;
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `${req.query.download === '0' ? 'inline' : 'attachment'}; filename="${name}"`);
  res.set('Cache-Control', 'private, no-store');
  res.send(file);
});

/** Called from the XentriPay webhook when the reference is not a shop order. Returns true if handled. */
export async function handleEventWebhook({ event: kind, references, trusted }) {
  const refs = references.filter(Boolean);
  if (!refs.length) return false;
  let reg = await EventRegistration.findOne({ where: { paymentReference: refs } });
  if (!reg) {
    const tokenPart = refs.map((r) => String(r).match(/^EV-([0-9a-f]{20})/i)?.[1]).find(Boolean);
    if (tokenPart) reg = await EventRegistration.findOne({ where: { token: { [Op.like]: `${tokenPart.toLowerCase()}%` } } });
  }
  if (!reg) return false;

  if (kind === 'COLLECTION_SUCCESSFUL') {
    if (!trusted) {
      // Without a webhook secret, confirm with XentriPay before trusting the payload.
      const client = await getXentripayClient();
      const fresh = client && reg.paymentReference ? await client.getCollectionStatus(reg.paymentReference).catch(() => null) : null;
      if (fresh?.status !== 'paid') return true;
    }
    const outcome = await confirmPayment(reg.id, { reference: refs[0] });
    if (outcome === 'confirmed') await afterConfirmed(reg.id);
  } else if (kind === 'COLLECTION_FAILED') {
    await markPaymentFailed(reg.id);
  }
  return true;
}
