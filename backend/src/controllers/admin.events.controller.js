import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { safeUrl, sanitizeUrls } from '../utils/safeUrl.js';
import { buildUniqueSlug } from '../utils/slug.js';
import {
  sequelize,
  User,
  Event,
  EventActivity,
  EventQuestion,
  EventRegistration,
  EventRegistrationActivity,
  QUESTION_TYPES,
  EVENT_STATUSES,
  FEE_PAYERS,
  TICKET_FIELDS,
  REGISTRATION_STATUSES,
} from '../models/index.js';
import {
  loadEvent,
  usage,
  expireHolds,
  registrationState,
  readRegistrationInput,
  reservePlaces,
  readHealth,
  registrationActivities,
} from '../utils/events.js';
import { sendTicket, checkFullyBooked, samplePdf } from './events.controller.js';

const UUID = /^[0-9a-f-]{36}$/i;
const str = (v, max) => (v === undefined || v === null ? null : String(v).trim().slice(0, max) || null);
const int = (v, fallback, { min = 0, max = 1_000_000 } = {}) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const dateTime = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** The questions a new event starts with; the admin edits, removes or adds to them. */
const STARTER_QUESTIONS = [
  { label: 'Age group', type: 'choice', options: ['18 to 24', '25 to 34', '35 to 44', '45 to 54', '55 and above'], required: true },
  { label: 'Are you a She Shape Wellness member?', type: 'choice', options: ['Yes', 'No', 'Used to be'], required: true },
  { label: 'Will you take part in the body assessment?', type: 'yesno', required: true },
  {
    label: 'Anything we should know before you move?',
    help: 'Injuries, pregnancy or conditions that affect training. This goes only to our team and the health professionals running the assessment.',
    type: 'longtext',
    sensitive: true,
  },
  {
    label: 'Allergies or dietary requirements',
    help: 'For the brunch. Seen only by our team and the health professionals.',
    type: 'longtext',
    sensitive: true,
  },
  { label: 'I am taking part at my own choice', type: 'consent', required: true },
  { label: 'May we photograph and film you on the day?', type: 'yesno', required: true },
  { label: 'How did you hear about it?', type: 'choice', options: ['Instagram', 'WhatsApp', 'A friend', 'A She Shape gym', 'A partner', 'Other'], required: true },
];

function readEventFields(body, { partial }) {
  const out = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const set = (k, v) => {
    if (!partial || has(k)) out[k] = v;
  };
  if (!partial || has('title')) {
    const title = str(body.title, 160);
    if (!title) throw new HttpError(400, 'Give the event a title.', [{ field: 'title', message: 'Title is required.' }]);
    out.title = title;
  }
  if (!partial || has('date')) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date ?? ''))) throw new HttpError(400, 'Choose the event date.', [{ field: 'date', message: 'Date is required.' }]);
    out.date = body.date;
  }
  if (has('slug') && str(body.slug, 120)) out.slug = str(body.slug, 120);
  set('ticketPrefix', (str(body.ticketPrefix, 8) || 'EVT').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'EVT');
  for (const [k, max] of [['tagline', 200], ['poweredBy', 120], ['startTime', 20], ['endTime', 20], ['venue', 200], ['priceNote', 120], ['picksLabel', 120], ['contactWhatsapp', 40], ['contactInstagram', 60]]) set(k, str(body[k], max));
  for (const [k, max] of [['description', 4000], ['fullMessage', 1000], ['closedMessage', 1000], ['dressCode', 1000], ['ticketNote', 3000]]) set(k, str(body[k], max));
  set('price', int(body.price, 0));
  set('totalPlaces', int(body.totalPlaces, 50));
  set('picks', int(body.picks, 1, { max: 20 }));
  set('holdMinutes', int(body.holdMinutes, 15, { min: 5, max: 120 }));
  set('healthRetentionDays', int(body.healthRetentionDays, 30, { min: 1, max: 3650 }));
  set('opensAt', dateTime(body.opensAt));
  set('closesAt', dateTime(body.closesAt));
  if (has('status')) {
    if (!EVENT_STATUSES.includes(body.status)) throw new HttpError(400, 'Unknown status.');
    out.status = body.status;
  }
  if (has('feePaidBy')) out.feePaidBy = FEE_PAYERS.includes(body.feePaidBy) ? body.feePaidBy : 'organiser';
  if (has('ticketFields')) out.ticketFields = Array.isArray(body.ticketFields) ? TICKET_FIELDS.filter((f) => body.ticketFields.includes(f)) : null;
  set('heroImage', safeUrl(body.heroImage) || null);
  set('gallery', (Array.isArray(body.gallery) ? body.gallery : []).slice(0, 12).map((g) => sanitizeUrls({ imageUrl: g?.imageUrl, caption: str(g?.caption, 120) || '' })).filter((g) => g.imageUrl));
  set('included', (Array.isArray(body.included) ? body.included : []).map((x) => str(x, 160)).filter(Boolean).slice(0, 20));
  set('partners', (Array.isArray(body.partners) ? body.partners : []).slice(0, 12).map((p) => sanitizeUrls({ name: str(p?.name, 80) || '', imageUrl: p?.imageUrl, href: p?.href })).filter((p) => p.imageUrl || p.name));
  return out;
}

function readActivities(list) {
  return (Array.isArray(list) ? list : []).slice(0, 40).map((a, i) => {
    const name = str(a?.name, 120);
    if (!name) throw new HttpError(400, 'Every activity needs a name.', [{ field: `activities.${i}.name`, message: 'Name is required.' }]);
    return {
      id: UUID.test(String(a?.id ?? '')) ? a.id : null,
      name,
      ledBy: str(a?.ledBy, 120),
      description: str(a?.description, 300),
      places: int(a?.places, 0),
      visible: a?.visible !== false,
      sortOrder: i,
    };
  });
}

function readQuestions(list) {
  return (Array.isArray(list) ? list : []).slice(0, 40).map((q, i) => {
    const label = str(q?.label, 300);
    if (!label) throw new HttpError(400, 'Every question needs its text.', [{ field: `questions.${i}.label`, message: 'Question text is required.' }]);
    const type = QUESTION_TYPES.includes(q?.type) ? q.type : 'text';
    const options = type === 'choice' ? (Array.isArray(q?.options) ? q.options : []).map((o) => str(o, 120)).filter(Boolean).slice(0, 20) : [];
    if (type === 'choice' && options.length < 2) throw new HttpError(400, `"${label}" needs at least two options.`);
    return { id: UUID.test(String(q?.id ?? '')) ? q.id : null, label, help: str(q?.help, 400), type, options, required: Boolean(q?.required), sensitive: Boolean(q?.sensitive), sortOrder: i };
  });
}

async function saveChildren(event, activities, questions, transaction) {
  if (activities) {
    const existing = await EventActivity.findAll({ where: { eventId: event.id }, transaction });
    const keep = new Set();
    for (const a of activities) {
      const row = a.id && existing.find((x) => x.id === a.id);
      if (row) {
        await row.update({ ...a, id: row.id }, { transaction });
        keep.add(row.id);
      } else {
        const created = await EventActivity.create({ ...a, id: undefined, eventId: event.id }, { transaction });
        keep.add(created.id);
      }
    }
    for (const row of existing.filter((x) => !keep.has(x.id))) {
      // An activity someone already holds is hidden, never deleted, so her ticket stays correct.
      const taken = await EventRegistrationActivity.count({ where: { activityId: row.id }, transaction });
      if (taken) await row.update({ visible: false, sortOrder: 999 }, { transaction });
      else await row.destroy({ transaction });
    }
  }
  if (questions) {
    const existing = await EventQuestion.findAll({ where: { eventId: event.id }, transaction });
    const keep = new Set();
    for (const q of questions) {
      const row = q.id && existing.find((x) => x.id === q.id);
      if (row) {
        await row.update({ ...q, id: row.id, active: true }, { transaction });
        keep.add(row.id);
      } else {
        const created = await EventQuestion.create({ ...q, id: undefined, eventId: event.id }, { transaction });
        keep.add(created.id);
      }
    }
    // Removed questions are switched off, so earlier answers keep their wording.
    for (const row of existing.filter((x) => !keep.has(x.id))) await row.update({ active: false }, { transaction });
  }
}

async function adminView(event) {
  await expireHolds({ eventId: event.id });
  const used = await usage(event.id);
  const counts = await EventRegistration.findAll({
    where: { eventId: event.id },
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
    group: ['status'],
    raw: true,
  });
  const byStatus = Object.fromEntries(REGISTRATION_STATUSES.map((s) => [s, 0]));
  for (const row of counts) byStatus[row.status] = Number(row.n);

  const activities = (event.activities ?? []).map((a) => ({
    ...a.toJSON(),
    confirmed: used.perActivity[a.id]?.confirmed ?? 0,
    held: (used.perActivity[a.id]?.reserved ?? 0) - (used.perActivity[a.id]?.confirmed ?? 0),
  }));
  const placesLeftInActivities = activities.filter((a) => a.visible).reduce((sum, a) => sum + Math.max(0, a.places - a.confirmed - a.held), 0);
  const womenLeft = Math.max(0, event.totalPlaces - used.reserved);
  const needed = womenLeft * event.picks;

  return {
    ...event.toJSON(),
    activities,
    questions: (event.questions ?? []).filter((q) => q.active),
    stats: {
      state: registrationState(event, used),
      confirmed: used.confirmed,
      holding: used.reserved - used.confirmed,
      placesLeft: Math.max(0, event.totalPlaces - used.confirmed),
      byStatus,
      placesLeftInActivities,
      // Warn when the activities cannot give the remaining people their full number of picks.
      shortfall: event.picks > 0 && needed > placesLeftInActivities ? { womenLeft, needed, available: placesLeftInActivities } : null,
    },
  };
}

async function findEvent(id) {
  if (!UUID.test(String(id))) throw new HttpError(404, 'Event not found');
  const event = await loadEvent({ id });
  if (!event) throw new HttpError(404, 'Event not found');
  return event;
}

export const list = asyncHandler(async (req, res) => {
  const events = await Event.findAll({ order: [['date', 'DESC']] });
  const data = [];
  for (const event of events) {
    const used = await usage(event.id);
    data.push({ id: event.id, slug: event.slug, title: event.title, date: event.date, status: event.status, price: event.price, totalPlaces: event.totalPlaces, confirmed: used.confirmed, state: registrationState(event, used) });
  }
  res.json({ data });
});

export const detail = asyncHandler(async (req, res) => {
  res.json({ data: await adminView(await findEvent(req.params.id)) });
});

export const create = asyncHandler(async (req, res) => {
  const fields = readEventFields(req.body ?? {}, { partial: false });
  const activities = req.body?.activities ? readActivities(req.body.activities) : [];
  const questions = req.body?.questions ? readQuestions(req.body.questions) : readQuestions(STARTER_QUESTIONS);
  const id = await sequelize.transaction(async (transaction) => {
    fields.slug = await buildUniqueSlug(Event, fields.slug || fields.title, { transaction });
    const event = await Event.create({ ...fields, status: fields.status ?? 'draft' }, { transaction });
    await saveChildren(event, activities, questions, transaction);
    return event.id;
  });
  res.status(201).json({ data: await adminView(await findEvent(id)) });
});

export const update = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  const fields = readEventFields(req.body ?? {}, { partial: true });
  const activities = req.body?.activities ? readActivities(req.body.activities) : null;
  const questions = req.body?.questions ? readQuestions(req.body.questions) : null;
  await sequelize.transaction(async (transaction) => {
    if (fields.slug && fields.slug !== event.slug) fields.slug = await buildUniqueSlug(Event, fields.slug, { excludeId: event.id, transaction });
    await event.update(fields, { transaction });
    await saveChildren(event, activities, questions, transaction);
  });
  // More places added (or fewer): re-arm or send the "fully booked" alert.
  await checkFullyBooked(event.id).catch((error) => console.error('[events] Full check failed', error.message));
  res.json({ data: await adminView(await findEvent(event.id)) });
});

export const ticketPreview = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', 'inline; filename="ticket-preview.pdf"');
  res.set('Cache-Control', 'no-store');
  res.send(await samplePdf(event));
});

/** Next year's edition: same page, activities and questions; no registrations; saved as a draft. */
export const duplicate = asyncHandler(async (req, res) => {
  const source = await findEvent(req.params.id);
  const id = await sequelize.transaction(async (transaction) => {
    const data = source.toJSON();
    for (const k of ['id', 'activities', 'questions', 'createdAt', 'updatedAt', 'ticketCounter', 'fullNotifiedAt']) delete data[k];
    data.title = `${source.title} (copy)`;
    data.slug = await buildUniqueSlug(Event, `${source.slug}-copy`, { transaction });
    data.status = 'draft';
    const copy = await Event.create(data, { transaction });
    await saveChildren(
      copy,
      source.activities.filter((a) => a.visible).map((a) => ({ name: a.name, ledBy: a.ledBy, description: a.description, places: a.places, visible: true, sortOrder: a.sortOrder })),
      source.questions.filter((q) => q.active).map((q) => ({ label: q.label, help: q.help, type: q.type, options: q.options, required: q.required, sensitive: q.sensitive, sortOrder: q.sortOrder })),
      transaction
    );
    return copy.id;
  });
  res.status(201).json({ data: await adminView(await findEvent(id)) });
});

export const remove = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  const paid = await EventRegistration.count({ where: { eventId: event.id, status: ['confirmed', 'attention'] } });
  if (paid) throw new HttpError(409, 'This event has confirmed registrations. Close it instead of deleting it.');
  await event.destroy();
  res.status(204).end();
});

// --- Registrations ---------------------------------------------------------

function registrationRow(reg, acts, { clinical }) {
  const out = {
    id: reg.id,
    token: reg.token,
    ticketNumber: reg.ticketNumber,
    status: reg.status,
    name: reg.name,
    phone: reg.phone,
    email: reg.email,
    activities: acts[reg.id] ?? [],
    amount: reg.amount,
    source: reg.source,
    paymentMethod: reg.paymentMethod,
    paymentReference: reg.paymentReference,
    paidAt: reg.paidAt,
    confirmedAt: reg.confirmedAt,
    checkedInAt: reg.checkedInAt,
    createdAt: reg.createdAt,
    hasHealthNote: reg.hasHealthNote,
    healthPurged: Boolean(reg.healthPurgedAt),
    adminNote: reg.adminNote,
    answers: reg.answers,
  };
  // Health answers only for medical accounts; everyone else sees that a note exists.
  if (clinical) out.health = readHealth(reg);
  return out;
}

async function findRegistration(event, regId) {
  if (!UUID.test(String(regId))) throw new HttpError(404, 'Registration not found');
  const reg = await EventRegistration.findOne({ where: { id: regId, eventId: event.id } });
  if (!reg) throw new HttpError(404, 'Registration not found');
  return reg;
}

export const registrations = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  await expireHolds({ eventId: event.id });
  const where = { eventId: event.id };
  if (REGISTRATION_STATUSES.includes(req.query.status)) where.status = req.query.status;
  else where.status = { [Op.ne]: 'expired' };
  const search = String(req.query.search ?? '').trim();
  if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { phone: { [Op.like]: `%${search.replace(/\s/g, '')}%` } }, { email: { [Op.like]: `%${search}%` } }, { ticketNumber: { [Op.like]: `%${search}%` } }];
  const regs = await EventRegistration.findAll({ where, order: [['createdAt', 'DESC']] });
  const acts = await registrationActivities(regs.map((r) => r.id));
  res.json({ data: regs.map((r) => registrationRow(r, acts, { clinical: false })) });
});

export const registrationDetail = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  const reg = await findRegistration(event, req.params.regId);
  const acts = await registrationActivities([reg.id]);
  res.json({ data: registrationRow(reg, acts, { clinical: Boolean(req.user.isClinical) }) });
});

/** A guest or partner's place: takes a place like any other, no payment. */
export const addRegistration = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  const input = readRegistrationInput(event, req.body, { skipRequired: true });
  const reg = await reservePlaces(event, input, { status: 'confirmed', source: 'admin' });
  if (req.body?.adminNote) await reg.update({ adminNote: str(req.body.adminNote, 300), amount: 0 });
  else await reg.update({ amount: 0 });
  if (req.body?.sendTicket !== false) sendTicket(await reg.reload()).catch((error) => console.error('[events] ticket email', error.message));
  checkFullyBooked(event.id).catch((error) => console.error('[events] Full check failed', error.message));
  const acts = await registrationActivities([reg.id]);
  res.status(201).json({ data: registrationRow(await reg.reload(), acts, { clinical: false }) });
});

export const changeActivities = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  const reg = await findRegistration(event, req.params.regId);
  if (!['confirmed', 'holding'].includes(reg.status)) throw new HttpError(400, 'Only active registrations can change activities.');
  const wanted = [...new Set((Array.isArray(req.body?.activityIds) ? req.body.activityIds : []).map(String))];

  await sequelize.transaction(async (transaction) => {
    const locked = await loadEvent({ id: event.id }, { transaction, lock: transaction.LOCK.UPDATE });
    const current = await EventRegistrationActivity.findAll({ where: { registrationId: reg.id }, transaction });
    const used = await usage(locked.id, { transaction });
    if (wanted.length > locked.picks) throw new HttpError(400, `Choose at most ${locked.picks}.`);
    for (const id of wanted) {
      const activity = locked.activities.find((a) => a.id === id);
      if (!activity) throw new HttpError(400, 'Unknown activity.');
      const mine = current.some((c) => c.activityId === id) ? 1 : 0;
      if ((used.perActivity[id]?.reserved ?? 0) - mine >= activity.places) throw new HttpError(409, `${activity.name} is full.`);
    }
    await EventRegistrationActivity.destroy({ where: { registrationId: reg.id }, transaction });
    await EventRegistrationActivity.bulkCreate(wanted.map((activityId) => ({ registrationId: reg.id, activityId, eventId: locked.id })), { transaction });
  });
  const acts = await registrationActivities([reg.id]);
  res.json({ data: registrationRow(reg, acts, { clinical: false }) });
});

export const cancel = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  const reg = await findRegistration(event, req.params.regId);
  await reg.update({ status: 'cancelled', cancelledAt: new Date(), holdExpiresAt: null, adminNote: str(req.body?.note, 300) ?? reg.adminNote });
  res.json({ data: { id: reg.id, status: reg.status } });
});

/** For a paid "attention" registration: give her the place anyway (the event goes one over if needed). */
export const forceConfirm = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  const reg = await findRegistration(event, req.params.regId);
  if (reg.status !== 'attention') throw new HttpError(400, 'Only registrations that need attention can be confirmed this way.');
  await sequelize.transaction(async (transaction) => {
    const locked = await Event.findByPk(event.id, { transaction, lock: transaction.LOCK.UPDATE });
    await locked.increment('ticketCounter', { transaction });
    await locked.reload({ transaction });
    await reg.update({ status: 'confirmed', confirmedAt: new Date(), adminNote: null, ticketNumber: reg.ticketNumber || `${locked.ticketPrefix}-${String(locked.ticketCounter).padStart(4, '0')}` }, { transaction });
  });
  sendTicket(await reg.reload()).catch((error) => console.error('[events] ticket email', error.message));
  checkFullyBooked(reg.eventId).catch((error) => console.error('[events] Full check failed', error.message));
  res.json({ data: { id: reg.id, status: 'confirmed' } });
});

export const resendTicket = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  const reg = await findRegistration(event, req.params.regId);
  if (reg.status !== 'confirmed') throw new HttpError(400, 'Only confirmed registrations have a ticket.');
  reg.ticketEmailedAt = null;
  await sendTicket(reg);
  res.json({ data: { sent: true } });
});

/** Her right to erasure: removes the registration and its answers entirely. */
export const erase = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  const reg = await findRegistration(event, req.params.regId);
  await reg.destroy();
  res.status(204).end();
});

export const roster = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  const regs = await EventRegistration.findAll({ where: { eventId: event.id, status: 'confirmed' }, order: [['name', 'ASC']] });
  const acts = await registrationActivities(regs.map((r) => r.id));
  const groups = event.activities.map((a) => ({
    id: a.id,
    name: a.name,
    ledBy: a.ledBy,
    places: a.places,
    people: regs.filter((r) => (acts[r.id] ?? []).some((x) => x.id === a.id)).map((r) => ({ name: r.name, phone: r.phone, ticketNumber: r.ticketNumber, hasHealthNote: r.hasHealthNote })),
  }));
  res.json({ data: { event: { title: event.title, date: event.date }, groups } });
});

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const exportCsv = asyncHandler(async (req, res) => {
  const event = await findEvent(req.params.id);
  const regs = await EventRegistration.findAll({ where: { eventId: event.id, status: { [Op.ne]: 'expired' } }, order: [['createdAt', 'ASC']] });
  const acts = await registrationActivities(regs.map((r) => r.id));
  const questions = event.questions.filter((q) => !q.sensitive);
  const header = ['Ticket', 'Status', 'Name', 'Phone', 'Email', 'Activities', 'Amount', 'Payment method', 'Payment reference', 'Paid at', 'Checked in', 'Health note', ...questions.map((q) => q.label)];
  const lines = [header.map(csvCell).join(',')];
  for (const r of regs) {
    const answers = Object.fromEntries((r.answers ?? []).map((a) => [a.questionId, a.value]));
    lines.push([
      r.ticketNumber, r.status, r.name, r.phone, r.email, (acts[r.id] ?? []).map((a) => a.name).join(' + '), r.amount, r.paymentMethod ?? r.source,
      r.paymentReference, r.paidAt?.toISOString() ?? '', r.checkedInAt ? 'yes' : '', r.hasHealthNote ? 'yes' : '',
      ...questions.map((q) => answers[q.id] ?? ''),
    ].map(csvCell).join(','));
  }
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${event.slug}-registrations.csv"`);
  res.send(`﻿${lines.join('\n')}`);
});

// --- Check-in (the QR code on the ticket opens this) ------------------------

const findTicket = (token) =>
  EventRegistration.findOne({
    where: { token: String(token ?? '') },
    include: [{ model: User, as: 'checkedInBy', attributes: ['name'], required: false }],
  });

export const checkInLookup = asyncHandler(async (req, res) => {
  const reg = await findTicket(req.params.token);
  if (!reg) throw new HttpError(404, 'Ticket not found');
  const event = await Event.findByPk(reg.eventId);
  const acts = await registrationActivities([reg.id]);
  res.json({
    data: {
      ...registrationRow(reg, acts, { clinical: false }),
      checkedInBy: reg.checkedInBy?.name ?? null,
      event: { id: event.id, title: event.title, date: event.date },
    },
  });
});

/**
 * Checks her in once. A second scan never overwrites the first: it reports
 * alreadyCheckedIn with the original time and who did it. The conditional
 * update means two phones scanning at the same moment cannot both "win".
 */
export const checkIn = asyncHandler(async (req, res) => {
  const reg = await findTicket(req.params.token);
  if (!reg) throw new HttpError(404, 'Ticket not found');
  if (reg.status !== 'confirmed') throw new HttpError(400, `This ticket is ${reg.status}, not confirmed. Do not let her in on it.`);

  const [changed] = await EventRegistration.update(
    { checkedInAt: new Date(), checkedInById: req.user.id },
    { where: { id: reg.id, checkedInAt: null } }
  );
  const fresh = await findTicket(req.params.token);
  res.json({
    data: {
      checkedInAt: fresh.checkedInAt,
      checkedInBy: fresh.checkedInBy?.name ?? null,
      alreadyCheckedIn: changed === 0,
    },
  });
});
