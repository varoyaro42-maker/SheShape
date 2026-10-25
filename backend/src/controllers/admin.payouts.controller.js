import { randomBytes } from 'node:crypto';
import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { Event, EventRegistration, Order, Payout, User } from '../models/index.js';
import { getSettingsRow, getXentripayClient, xentripayConfig, xentripayReady } from '../utils/payments/index.js';
import { PAYOUT_PROVIDERS } from '../utils/payments/xentripay.js';
import { PHONE_PATTERN, normalizePhone } from '../utils/phone.js';

const MIN_PAYOUT = 100;
const RECENT_LIMIT = 200;

// Successful payments that came in through XentriPay: shop orders and event tickets.
// A cancelled order or ticket is left out (refunded, or a test payment).
const paidOrders = { paymentProvider: 'xentripay', paidAt: { [Op.ne]: null }, status: { [Op.ne]: 'cancelled' } };
const paidTickets = {
  source: 'online',
  paymentReference: { [Op.ne]: null },
  paidAt: { [Op.ne]: null },
  status: { [Op.ne]: 'cancelled' },
};

// XentriPay's collection fee, taken from the amount when we pay it (3% as of Oct 2026).
const feePercent = () => {
  const value = Number(process.env.XENTRIPAY_FEE_PERCENT);
  return Number.isFinite(value) && value >= 0 ? value : 3;
};

/** Every successful payment with what XentriPay kept and what reached the wallet, newest first. */
async function successfulPayments() {
  const [settings, orders, tickets] = await Promise.all([
    getSettingsRow(),
    Order.findAll({
      where: paidOrders,
      attributes: ['id', 'orderNumber', 'customerName', 'customerPhone', 'total', 'paymentMethod', 'paymentReference', 'paidAt'],
    }),
    EventRegistration.findAll({
      where: paidTickets,
      attributes: ['id', 'eventId', 'name', 'phone', 'amount', 'paymentMethod', 'paymentReference', 'paidAt', 'ticketNumber'],
      include: [{ model: Event, as: 'event', attributes: ['id', 'title', 'feePaidBy'] }],
    }),
  ]);

  const rate = feePercent() / 100;
  const withFee = (row, shopPaysFee) => {
    const fee = shopPaysFee ? Math.round(row.amount * rate) : 0;
    return { ...row, fee, net: row.amount - fee };
  };

  return [
    ...orders.map((o) =>
      withFee(
        {
          kind: 'order',
          id: o.id,
          source: 'shop',
          sourceLabel: 'Shop',
          label: `Order ${o.orderNumber}`,
          name: o.customerName,
          phone: o.customerPhone,
          amount: o.total,
          method: o.paymentMethod,
          reference: o.paymentReference,
          paidAt: o.paidAt,
        },
        settings.xentripayChargesIncluded === true
      )
    ),
    ...tickets.map((t) =>
      withFee(
        {
          kind: 'ticket',
          id: t.id,
          eventId: t.eventId,
          source: `event:${t.eventId}`,
          sourceLabel: t.event?.title ?? 'Event',
          label: t.ticketNumber ? `Ticket ${t.ticketNumber}` : 'Event ticket',
          name: t.name,
          phone: t.phone,
          amount: t.amount,
          method: t.paymentMethod,
          reference: t.paymentReference,
          paidAt: t.paidAt,
        },
        t.event?.feePaidBy !== 'customer'
      )
    ),
  ].sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
}

const add = (rows, key) => rows.reduce((sum, row) => sum + row[key], 0);

/** Totals for the payments page, worked out from the site's own records. */
async function totals() {
  const [payments, payouts] = await Promise.all([
    successfulPayments(),
    Payout.findAll({ where: { status: ['pending', 'successful'] }, attributes: ['status', 'amount', 'charge'] }),
  ]);

  const out = (status) =>
    payouts.filter((p) => p.status === status).reduce((sum, p) => sum + p.amount + (p.charge ?? 0), 0);

  const sources = new Map();
  for (const row of payments) {
    const entry = sources.get(row.source) ?? { source: row.source, label: row.sourceLabel, eventId: row.eventId ?? null, rows: [] };
    entry.rows.push(row);
    sources.set(row.source, entry);
  }

  const net = add(payments, 'net');
  const paidOut = out('successful');
  const waiting = out('pending');

  return {
    count: payments.length,
    received: add(payments, 'amount'),
    fees: add(payments, 'fee'),
    net,
    feePercent: feePercent(),
    bySource: [...sources.values()]
      .map(({ rows, ...entry }) => ({ ...entry, count: rows.length, amount: add(rows, 'amount'), fee: add(rows, 'fee'), net: add(rows, 'net') }))
      .sort((a, b) => b.amount - a.amount),
    paidOut,
    waiting,
    estimatedBalance: net - paidOut - waiting,
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

/** The latest successful payments, orders and tickets together. */
export const received = asyncHandler(async (req, res) => {
  res.json({ data: (await successfulPayments()).slice(0, RECENT_LIMIT) });
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

// Webhook event names, compared without underscores: the guide spells them both ways.
const PAYOUT_EVENTS = {
  PAYOUTSUCCESS: 'successful',
  PAYMENTREQUESTCOMPLETED: 'successful',
  PAYOUTFAILED: 'failed',
  PAYMENTREQUESTFAILED: 'failed',
  PAYOUTREVERSED: 'reversed',
  PAYMENTREQUESTREVERSED: 'reversed',
};
const PAYOUT_NOTES = {
  SINGLEPAYOUTCREATEDPENDINGOTP: 'Waiting for the OTP to be confirmed in XentriPay.',
  SINGLEPAYOUTCONFIRMED: 'OTP confirmed. XentriPay is sending the money.',
  PAYOUTCONFIRMED: 'OTP confirmed. XentriPay is sending the money.',
};

export const isPayoutEvent = (event) => /^(SINGLE_?PAYOUT|PAYOUT|PAYMENT_?REQUEST)/.test(String(event ?? '').toUpperCase());

/**
 * Called by the XentriPay webhook for payout events. `trusted` is true when
 * the signature was checked; otherwise the status is asked from XentriPay.
 */
export async function handlePayoutWebhook({ event, references, trusted }) {
  if (!references.length) return;

  const payout = await Payout.findOne({
    where: { [Op.or]: [{ reference: references }, { xentripayId: references }, { internalRef: references }] },
  });
  if (!payout) return;

  const key = String(event).toUpperCase().replace(/_/g, '');
  let status = PAYOUT_EVENTS[key];

  if (status && !trusted) {
    const client = await getXentripayClient();
    const fresh = client ? await client.getPayoutStatus(payout.reference).catch(() => null) : null;
    status = fresh?.status && fresh.status !== 'pending' ? fresh.status : null;
  }

  // Only a sent payout can be reversed; a finished one never goes back to waiting.
  const allowed = payout.status === 'pending' || (payout.status === 'successful' && status === 'reversed');

  if (status && allowed) {
    payout.status = status;
    if (status === 'successful') payout.completedAt = new Date();
    if (status === 'failed') payout.statusMessage = 'XentriPay reported the payout failed.';
    if (status === 'reversed') payout.statusMessage = 'The payout was reversed by the provider.';
  } else if (PAYOUT_NOTES[key] && payout.status === 'pending') {
    payout.statusMessage = PAYOUT_NOTES[key];
  } else {
    return;
  }

  payout.checkedAt = new Date();
  await payout.save();
}
