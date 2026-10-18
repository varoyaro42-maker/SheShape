import { Op } from 'sequelize';
import {
  sequelize,
  Event,
  EventActivity,
  EventQuestion,
  EventRegistration,
  EventRegistrationActivity,
} from '../models/index.js';
import { HttpError } from './httpError.js';
import { encrypt, decrypt } from './crypto.js';
import { normalizePhone, PHONE_PATTERN } from './phone.js';

/** A registration holds places while it is confirmed, or holding and not yet expired. */
const holdsPlaces = (now = new Date()) => ({
  [Op.or]: [{ status: 'confirmed' }, { status: 'holding', holdExpiresAt: { [Op.gt]: now } }],
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Holds past their time go back to the pool. Safe to call anywhere, any number of times. */
export async function expireHolds({ eventId, transaction } = {}) {
  const where = { status: 'holding', holdExpiresAt: { [Op.lte]: new Date() } };
  if (eventId) where.eventId = eventId;
  const [count] = await EventRegistration.update({ status: 'expired' }, { where, transaction });
  return count;
}

/**
 * Places used per activity and in total.
 * `reserved` counts confirmed + live holds (what we check against);
 * `confirmed` counts only paid places (what the public page shows, per the brief).
 */
export async function usage(eventId, { transaction } = {}) {
  const now = new Date();
  const [reservedRegs, confirmedRegs] = await Promise.all([
    EventRegistration.findAll({ where: { eventId, ...holdsPlaces(now) }, attributes: ['id', 'status'], transaction }),
    Promise.resolve(null),
  ]);
  const ids = reservedRegs.map((r) => r.id);
  const confirmedIds = new Set(reservedRegs.filter((r) => r.status === 'confirmed').map((r) => r.id));
  void confirmedRegs;

  const picks = ids.length
    ? await EventRegistrationActivity.findAll({ where: { registrationId: ids }, attributes: ['registrationId', 'activityId'], transaction })
    : [];

  const perActivity = {};
  for (const pick of picks) {
    const entry = (perActivity[pick.activityId] ??= { reserved: 0, confirmed: 0 });
    entry.reserved += 1;
    if (confirmedIds.has(pick.registrationId)) entry.confirmed += 1;
  }

  return { reserved: ids.length, confirmed: confirmedIds.size, perActivity };
}

export function registrationState(event, used) {
  const now = new Date();
  if (event.status === 'draft') return 'draft';
  if (event.status === 'closed') return 'closed';
  if (event.opensAt && new Date(event.opensAt) > now) return 'not_open';
  if (event.closesAt && new Date(event.closesAt) <= now) return 'closed';
  if (used.confirmed >= event.totalPlaces) return 'full';
  return 'open';
}

export async function loadEvent(where, { transaction, lock } = {}) {
  return Event.findOne({
    where,
    include: [
      { model: EventActivity, as: 'activities', required: false },
      { model: EventQuestion, as: 'questions', required: false },
    ],
    order: [
      [{ model: EventActivity, as: 'activities' }, 'sortOrder', 'ASC'],
      [{ model: EventQuestion, as: 'questions' }, 'sortOrder', 'ASC'],
    ],
    transaction,
    lock,
  });
}

/** What the public page needs. Counts are always live. */
export async function publicEvent(event) {
  await expireHolds({ eventId: event.id });
  const used = await usage(event.id);
  const state = registrationState(event, used);
  const activities = (event.activities ?? [])
    .filter((a) => a.visible)
    .map((a) => {
      const confirmed = used.perActivity[a.id]?.confirmed ?? 0;
      return {
        id: a.id,
        name: a.name,
        ledBy: a.ledBy,
        description: a.description,
        places: a.places,
        left: Math.max(0, a.places - confirmed),
      };
    });
  const questions = (event.questions ?? [])
    .filter((q) => q.active)
    .map((q) => ({ id: q.id, label: q.label, help: q.help, type: q.type, options: q.options, required: q.required, sensitive: q.sensitive }));

  return {
    slug: event.slug,
    title: event.title,
    tagline: event.tagline,
    description: event.description,
    poweredBy: event.poweredBy,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    venue: event.venue,
    price: event.price,
    priceNote: event.priceNote,
    picks: event.picks,
    picksLabel: event.picksLabel,
    closesAt: event.closesAt,
    opensAt: event.opensAt,
    heroImage: event.heroImage,
    gallery: event.gallery,
    included: event.included,
    partners: event.partners,
    dressCode: event.dressCode,
    contactWhatsapp: event.contactWhatsapp,
    contactInstagram: event.contactInstagram,
    fullMessage: event.fullMessage,
    closedMessage: event.closedMessage,
    feePaidBy: event.feePaidBy,
    holdMinutes: event.holdMinutes,
    state,
    placesLeft: Math.max(0, event.totalPlaces - used.confirmed),
    totalPlaces: event.totalPlaces,
    activities,
    questions,
  };
}

/** Validates name, contact, answers and picks. Throws 400 with field errors. */
export function readRegistrationInput(event, body, { requirePhonePattern = false, skipRequired = false } = {}) {
  const errors = [];
  const name = String(body?.name ?? '').trim().slice(0, 120);
  const email = String(body?.email ?? '').trim().toLowerCase().slice(0, 160);
  const rawPhone = String(body?.phone ?? '').trim();
  const local = normalizePhone(rawPhone);
  const phone = PHONE_PATTERN.test(local) ? local : rawPhone.replace(/[^\d+]/g, '');

  if (name.length < 2) errors.push({ field: 'name', message: 'Enter your full name.' });
  if (!EMAIL.test(email)) errors.push({ field: 'email', message: 'Enter a valid email address.' });
  if (requirePhonePattern ? !PHONE_PATTERN.test(phone) : !/^\+?\d{9,15}$/.test(phone)) {
    errors.push({ field: 'phone', message: 'Enter a valid phone number.' });
  }

  const now = new Date().toISOString();
  const given = body?.answers && typeof body.answers === 'object' ? body.answers : {};
  const answers = [];
  const health = [];

  for (const q of (event.questions ?? []).filter((x) => x.active)) {
    let value = given[q.id];
    if (q.type === 'consent') value = value === true || value === 'true' || value === 'yes';
    else value = value === undefined || value === null ? '' : String(value).trim();

    const empty = q.type === 'consent' ? value !== true : value === '';
    if (q.required && empty && !skipRequired) {
      errors.push({ field: `q_${q.id}`, message: q.type === 'consent' ? 'Please tick to confirm.' : 'This question needs an answer.' });
      continue;
    }
    if (empty) continue;
    if (q.type === 'choice' && !q.options.includes(value)) errors.push({ field: `q_${q.id}`, message: 'Choose one of the options.' });
    if (q.type === 'yesno' && !['yes', 'no'].includes(value)) errors.push({ field: `q_${q.id}`, message: 'Answer yes or no.' });
    if (typeof value === 'string' && value.length > (q.type === 'longtext' ? 2000 : 300)) {
      errors.push({ field: `q_${q.id}`, message: 'That answer is too long.' });
    }

    const entry = { questionId: q.id, label: q.label, value: q.type === 'consent' ? 'yes' : value, answeredAt: now };
    (q.sensitive ? health : answers).push(entry);
  }

  const activityIds = [...new Set((Array.isArray(body?.activityIds) ? body.activityIds : []).map(String))];
  if (errors.length) throw new HttpError(400, 'Please check the highlighted fields.', errors);

  return { name, email, phone, answers, health, activityIds };
}

/**
 * Reserves places inside one transaction that locks the event row, so two
 * people can never take the same last place. Returns the new registration.
 */
export async function reservePlaces(event, input, { status = 'holding', source = 'online', paymentMethod = null } = {}) {
  return sequelize.transaction(async (transaction) => {
    const locked = await loadEvent({ id: event.id }, { transaction, lock: transaction.LOCK.UPDATE });
    await expireHolds({ eventId: locked.id, transaction });

    // Her own unfinished attempt (same email) should not block her new one.
    if (source === 'online') {
      await EventRegistration.update(
        { status: 'expired' },
        { where: { eventId: locked.id, status: 'holding', email: input.email }, transaction }
      );
    }

    const used = await usage(locked.id, { transaction });
    const state = registrationState(locked, used);
    if (source === 'online' && state !== 'open') {
      throw new HttpError(409, state === 'full' ? locked.fullMessage || 'This event is fully booked.' : 'Registration is closed.', [], { state });
    }
    if (used.reserved >= locked.totalPlaces) {
      throw new HttpError(409, 'The last places are being paid for right now. Try again in a few minutes.', [], { state: 'busy' });
    }

    const visible = locked.activities.filter((a) => a.visible);
    const open = visible.filter((a) => (used.perActivity[a.id]?.reserved ?? 0) < a.places);
    const needed = Math.min(locked.picks, open.length);
    const chosen = input.activityIds.map((id) => visible.find((a) => a.id === id)).filter(Boolean);

    const full = chosen.filter((a) => (used.perActivity[a.id]?.reserved ?? 0) >= a.places);
    if (full.length) {
      throw new HttpError(
        409,
        `${full.map((a) => a.name).join(' and ')} ${full.length > 1 ? 'have' : 'has'} just filled. Choose from the activities still open.`,
        [{ field: 'activities', message: 'An activity you chose is full.' }],
        { state: 'activity_full', fullActivityIds: full.map((a) => a.id), openActivityIds: open.map((a) => a.id) }
      );
    }
    const wrongCount = source === 'admin' ? chosen.length > locked.picks : chosen.length !== needed;
    if (chosen.length !== input.activityIds.length || wrongCount) {
      throw new HttpError(400, needed === 1 ? 'Choose 1 activity.' : `Choose ${needed} activities.`, [
        { field: 'activities', message: needed === 1 ? 'Only one activity has space left: choose it.' : `Choose ${needed} activities.` },
      ]);
    }

    const holdUntil = new Date(Date.now() + locked.holdMinutes * 60 * 1000);
    const registration = await EventRegistration.create(
      {
        eventId: locked.id,
        status,
        name: input.name,
        phone: input.phone,
        email: input.email,
        answers: input.answers,
        hasHealthNote: input.health.length > 0,
        healthAnswersEnc: input.health.length ? encrypt(JSON.stringify(input.health)) : null,
        amount: locked.price,
        source,
        paymentMethod,
        holdExpiresAt: status === 'holding' ? holdUntil : null,
        confirmedAt: status === 'confirmed' ? new Date() : null,
      },
      { transaction }
    );
    await EventRegistrationActivity.bulkCreate(
      chosen.map((a) => ({ registrationId: registration.id, activityId: a.id, eventId: locked.id })),
      { transaction }
    );
    if (status === 'confirmed') await assignTicketNumber(registration, locked, transaction);
    return registration;
  });
}

async function assignTicketNumber(registration, event, transaction) {
  if (registration.ticketNumber) return;
  await event.increment('ticketCounter', { transaction });
  await event.reload({ transaction });
  registration.ticketNumber = `${event.ticketPrefix}-${String(event.ticketCounter).padStart(4, '0')}`;
  await registration.save({ transaction });
}

/**
 * Payment succeeded. Confirms her place, even if the hold had expired, as long
 * as her places are still free; otherwise flags it for an admin. Idempotent.
 * Returns true when this call is the one that confirmed it.
 */
export async function confirmPayment(registrationId, { reference, transactionId } = {}) {
  return sequelize.transaction(async (transaction) => {
    const reg = await EventRegistration.findByPk(registrationId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!reg || ['confirmed', 'attention', 'cancelled'].includes(reg.status)) return false;

    const event = await loadEvent({ id: reg.eventId }, { transaction, lock: transaction.LOCK.UPDATE });
    reg.paidAt = new Date();
    if (reference) reg.paymentReference = reg.paymentReference || reference;
    if (transactionId) reg.paymentTransactionId = transactionId;

    let ok = true;
    if (reg.status === 'expired') {
      // Late payment: her places went back to the pool. Take them again only if still free.
      const used = await usage(event.id, { transaction });
      const picks = await EventRegistrationActivity.findAll({ where: { registrationId: reg.id }, transaction });
      ok =
        used.reserved < event.totalPlaces &&
        picks.every((p) => {
          const activity = event.activities.find((a) => a.id === p.activityId);
          return activity && (used.perActivity[p.activityId]?.reserved ?? 0) < activity.places;
        });
    }

    if (ok) {
      reg.status = 'confirmed';
      reg.confirmedAt = new Date();
      reg.holdExpiresAt = null;
      await reg.save({ transaction });
      await assignTicketNumber(reg, event, transaction);
    } else {
      reg.status = 'attention';
      reg.adminNote = 'Paid after the hold expired and the places had gone. Refund, or add a place and confirm.';
      await reg.save({ transaction });
    }
    return ok ? 'confirmed' : 'attention';
  });
}

export async function markPaymentFailed(registrationId) {
  const reg = await EventRegistration.findByPk(registrationId);
  if (!reg || reg.status !== 'holding') return;
  reg.status = 'expired';
  reg.paymentFailedAt = new Date();
  await reg.save();
}

export function readHealth(registration) {
  if (!registration.healthAnswersEnc) return [];
  try {
    return JSON.parse(decrypt(registration.healthAnswersEnc));
  } catch {
    return [];
  }
}

/** Deletes health answers once an event is more than its retention period in the past. */
export async function purgeHealthAnswers() {
  const events = await Event.findAll({ attributes: ['id', 'date', 'healthRetentionDays'] });
  let purged = 0;
  for (const event of events) {
    const cutoff = new Date(`${event.date}T23:59:59+02:00`);
    cutoff.setDate(cutoff.getDate() + event.healthRetentionDays);
    if (cutoff > new Date()) continue;
    const [count] = await EventRegistration.update(
      { healthAnswersEnc: null, healthPurgedAt: new Date() },
      { where: { eventId: event.id, healthAnswersEnc: { [Op.ne]: null } } }
    );
    purged += count;
  }
  return purged;
}

export async function registrationActivities(registrationIds) {
  if (!registrationIds.length) return {};
  const rows = await EventRegistrationActivity.findAll({
    where: { registrationId: registrationIds },
    include: [{ model: EventActivity, as: 'activity', attributes: ['id', 'name'] }],
  });
  const map = {};
  for (const row of rows) (map[row.registrationId] ??= []).push({ id: row.activityId, name: row.activity?.name ?? 'Removed activity' });
  return map;
}
