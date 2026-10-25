import { randomBytes } from 'node:crypto';
import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { Event, EventRegistration, Order, Payout, User } from '../models/index.js';
import { getSettingsRow, getXentripayClient, xentripayConfig, xentripayReady } from '../utils/payments/index.js';
import { PAYOUT_PROVIDERS } from '../utils/payments/xentripay.js';
import { PHONE_PATTERN, normalizePhone } from '../utils/phone.js';

const MIN_PAYOUT = 100;
const RECENT_LIMIT = 50;

// Money that came in through XentriPay: shop orders and event tickets.
const paidOrders = { paymentProvider: 'xentripay', paidAt: { [Op.ne]: null } };
const paidTickets = { source: 'online', paymentReference: { [Op.ne]: null }, paidAt: { [Op.ne]: null } };

const sumOf = async (model, field, where) => Number((await model.sum(field, { where })) || 0);

/** Totals for the payments page. The real wallet balance lives in the XentriPay dashboard. */
async function totals() {
  const [ordersTotal, ordersCount, ticketsTotal, ticketsCount, payouts] = await Promise.all([
    sumOf(Order, 'total', paidOrders),
    Order.count({ where: paidOrders }),
    sumOf(EventRegistration, 'amount', paidTickets),
    EventRegistration.count({ where: paidTickets }),
    Payout.findAll({ where: { status: ['pending', 'successful'] }, attributes: ['status', 'amount', 'charge'] }),
  ]);

  const out = (status) =>
    payouts.filter((p) => p.status === status).reduce((sum, p) => sum + p.amount + (p.charge ?? 0), 0);

  const received = ordersTotal + ticketsTotal;
  const paidOut = out('successful');
  const waiting = out('pending');

  return {
    received,
    orders: { count: ordersCount, total: ordersTotal },
    tickets: { count: ticketsCount, total: ticketsTotal },
    paidOut,
    waiting,
    estimatedBalance: received - paidOut - waiting,
  };
}

export const summary = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  res.json({
    data: {
      ...(await totals()),
      ready: xentripayReady(row),
      environment: xentripayConfig(row)?.environment ?? row.xentripayEnvironment,
      providers: PAYOUT_PROVIDERS,
    },
  });
});

/** The latest payments received, orders and tickets together, newest first. */
export const received = asyncHandler(async (req, res) => {
  const [orders, tickets] = await Promise.all([
    Order.findAll({
      where: paidOrders,
      attributes: ['id', 'orderNumber', 'customerName', 'total', 'paymentMethod', 'paymentReference', 'paidAt'],
      order: [['paidAt', 'DESC']],
      limit: RECENT_LIMIT,
    }),
    EventRegistration.findAll({
      where: paidTickets,
      attributes: ['id', 'eventId', 'name', 'amount', 'paymentMethod', 'paymentReference', 'paidAt', 'ticketNumber'],
      include: [{ model: Event, as: 'event', attributes: ['id', 'title'] }],
      order: [['paidAt', 'DESC']],
      limit: RECENT_LIMIT,
    }),
  ]);

  const rows = [
    ...orders.map((o) => ({
      kind: 'order',
      id: o.id,
      label: `Order ${o.orderNumber}`,
      name: o.customerName,
      amount: o.total,
      method: o.paymentMethod,
      reference: o.paymentReference,
      paidAt: o.paidAt,
    })),
    ...tickets.map((t) => ({
      kind: 'ticket',
      id: t.id,
      eventId: t.eventId,
      label: t.event ? `${t.event.title} ticket` : 'Event ticket',
      name: t.name,
      amount: t.amount,
      method: t.paymentMethod,
      reference: t.paymentReference,
      paidAt: t.paidAt,
    })),
  ]
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
    .slice(0, RECENT_LIMIT);

  res.json({ data: rows });
});

export const list = asyncHandler(async (req, res) => {
  const rows = await Payout.findAll({
    include: [{ model: User, as: 'createdBy', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  res.json({ data: rows });
});

function readPayoutInput(body = {}) {
  const provider = PAYOUT_PROVIDERS.find((p) => p.id === String(body.providerId ?? ''));
  if (!provider) throw new HttpError(400, 'Choose where to send the money.', [{ field: 'providerId', message: 'Choose a provider.' }]);

  const name = String(body.name ?? '').trim();
  if (name.length < 2 || name.length > 120) {
    throw new HttpError(400, "Enter the recipient's full name.", [{ field: 'name', message: 'Enter the full name.' }]);
  }

  let account;
  if (provider.type === 'momo') {
    const phone = normalizePhone(String(body.account ?? '').trim());
    if (!PHONE_PATTERN.test(phone ?? '')) {
      throw new HttpError(400, 'Enter a valid Rwandan mobile money number.', [{ field: 'account', message: 'Enter a valid phone number.' }]);
    }
    // Payouts take the local format, without 250.
    account = `0${phone.slice(4)}`;
  } else {
    account = String(body.account ?? '').replace(/[\s-]/g, '');
    if (!/^\d{5,30}$/.test(account)) {
      throw new HttpError(400, 'Enter the bank account number, digits only.', [{ field: 'account', message: 'Enter the account number.' }]);
    }
  }

  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount < MIN_PAYOUT) {
    throw new HttpError(400, `Enter a whole amount of at least ${MIN_PAYOUT} RWF.`, [{ field: 'amount', message: 'Check the amount.' }]);
  }

  const note = String(body.note ?? '').trim().slice(0, 300) || null;

  return { provider, name, account, amount, note };
}

const newReference = () => `SSW-PO-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;

export const create = asyncHandler(async (req, res) => {
  const input = readPayoutInput(req.body);

  const client = await getXentripayClient();
  if (!client) throw new HttpError(503, 'XentriPay is not set up. Add the API key in Payment settings first.');

  const payout = await Payout.create({
    reference: newReference(),
    providerId: input.provider.id,
    providerName: input.provider.name,
    account: input.account,
    name: input.name,
    amount: input.amount,
    note: input.note,
    createdById: req.user.id,
  });

  try {
    const result = await client.initiatePayout({
      reference: payout.reference,
      providerId: input.provider.id,
      account: input.account,
      name: input.name,
      amount: input.amount,
    });

    Object.assign(payout, {
      status: result.status,
      statusMessage: result.message?.slice(0, 300) || null,
      xentripayId: result.id,
      internalRef: result.internalRef,
      charge: result.charge,
      validatedName: result.validatedName?.slice(0, 120) || null,
      checkedAt: new Date(),
      completedAt: result.status === 'successful' ? new Date() : null,
    });
    await payout.save();
  } catch (error) {
    console.error('[payouts] XentriPay refused payout', payout.reference, error.message);
    payout.status = 'failed';
    payout.statusMessage = String(error.message || 'XentriPay refused the payout').slice(0, 300);
    payout.checkedAt = new Date();
    await payout.save();
    throw new HttpError(422, `XentriPay did not accept the payout: ${payout.statusMessage}`);
  }

  res.status(201).json({ data: payout });
});

/** Ask XentriPay for the latest status of a payout. */
export const refresh = asyncHandler(async (req, res) => {
  const payout = await Payout.findByPk(String(req.params.id ?? ''));
  if (!payout) throw new HttpError(404, 'Payout not found');

  if (payout.status === 'pending') {
    const client = await getXentripayClient();
    if (!client) throw new HttpError(503, 'XentriPay is not set up.');

    try {
      const result = await client.getPayoutStatus(payout.reference);
      payout.status = result.status;
      if (result.status === 'successful') payout.completedAt = new Date();
    } catch (error) {
      // A payout still waiting for its OTP may not be known to the provider yet.
      console.error('[payouts] Status check failed for', payout.reference, error.message);
    }
    payout.checkedAt = new Date();
    await payout.save();
  }

  res.json({ data: payout });
});
