import { AsyncLocalStorage } from 'node:async_hooks';
import { sequelize } from '../db.js';

/**
 * The activity log. Two sources:
 * - sign-ins and sign-outs, written by the auth controller (`logAuth`);
 * - every admin change: `auditAdminWrites` wraps each POST/PUT/PATCH/DELETE
 *   under /api/admin, model hooks collect what was created, changed or
 *   deleted during the request, and one row is written when it succeeds.
 */
const store = new AsyncLocalStorage();

const MAX_CHANGES = 50;
const MAX_VALUE = 200;
// Models whose rows are the log itself or one-time codes.
const SKIP_MODELS = new Set(['AuditLog', 'OtpCode']);
// Never copied into the log.
const SECRET = /password|passwordhash|token|secret|apikey|codehash|enc$|^answers$|health/i;
const NOISE = new Set(['createdAt', 'updatedAt']);

const MODEL_LABELS = {
  Product: 'product',
  products: 'product',
  ProductImage: 'product photo',
  product_images: 'product photo',
  Category: 'category',
  categories: 'category',
  Order: 'order',
  OrderItem: 'order item',
  Post: 'blog post',
  Program: 'program',
  ProgramVideo: 'program video',
  PaymentSettings: 'payment settings',
  HomeContent: 'site content',
  ContactMessage: 'message',
  Subscriber: 'subscriber',
  Booking: 'booking',
  AdminInvite: 'admin invite',
  User: 'account',
  Event: 'event',
  EventActivity: 'event activity',
  EventQuestion: 'event question',
  EventRegistration: 'registration',
  EventRegistrationActivity: 'registration activity',
  Payout: 'payout',
};

let AuditLogModel = null;
export function useAuditModel(model) {
  AuditLogModel = model;
}

function shortValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return text.length > MAX_VALUE ? `${text.slice(0, MAX_VALUE)}…` : text;
}

function displayName(instance) {
  const v = instance.dataValues ?? {};
  return v.name || v.title || v.orderNumber || v.ticketNumber || v.email || v.reference || v.customerName || null;
}

function record(change) {
  const ctx = store.getStore();
  if (!ctx || ctx.changes.length >= MAX_CHANGES) return;
  ctx.changes.push(change);
}

function describe(instance, op, fields) {
  const model = instance.constructor.name;
  return {
    op,
    model,
    label: MODEL_LABELS[model] ?? model,
    id: instance.get?.('id') ?? null,
    name: displayName(instance),
    ...(fields ? { fields } : {}),
  };
}

export function installAuditHooks() {
  sequelize.addHook('afterCreate', (instance) => {
    if (SKIP_MODELS.has(instance.constructor.name)) return;
    record(describe(instance, 'create'));
  });

  sequelize.addHook('afterUpdate', (instance) => {
    if (SKIP_MODELS.has(instance.constructor.name)) return;
    const fields = {};
    for (const key of instance.changed() || []) {
      if (NOISE.has(key)) continue;
      fields[key] = SECRET.test(key)
        ? { before: '(hidden)', after: '(changed)' }
        : { before: shortValue(instance.previous(key)), after: shortValue(instance.get(key)) };
    }
    if (Object.keys(fields).length) record(describe(instance, 'update', fields));
  });

  sequelize.addHook('afterDestroy', (instance) => {
    if (SKIP_MODELS.has(instance.constructor.name)) return;
    record(describe(instance, 'delete'));
  });

  sequelize.addHook('afterBulkUpdate', (options) => {
    const model = options.model?.name;
    if (!model || SKIP_MODELS.has(model)) return;
    const fields = Object.fromEntries(
      Object.entries(options.attributes ?? {})
        .filter(([key]) => !NOISE.has(key))
        .map(([key, value]) => [key, { before: null, after: SECRET.test(key) ? '(changed)' : shortValue(value) }])
    );
    record({ op: 'update', model, label: MODEL_LABELS[model] ?? model, id: null, name: null, many: true, fields });
  });

  sequelize.addHook('afterBulkDestroy', (options) => {
    const model = options.model?.name;
    if (!model || SKIP_MODELS.has(model)) return;
    record({ op: 'delete', model, label: MODEL_LABELS[model] ?? model, id: null, name: null, many: true });
  });
}

const clientInfo = (req) => ({
  ip: String(req.ip || '').slice(0, 64) || null,
  userAgent: String(req.get?.('user-agent') || '').slice(0, 300) || null,
});

const who = (user) => ({
  userId: user?.id ?? null,
  userName: user?.name ?? null,
  userEmail: user?.email ?? null,
  role: user?.role ?? null,
});

async function write(row) {
  if (!AuditLogModel) return;
  try {
    await AuditLogModel.create(row);
  } catch (error) {
    // The log must never break the action it records.
    console.error('[audit] could not write entry:', error.message);
  }
}

/** Sign-in events. `user` may be null for a failed attempt on an unknown email. */
export function logAuth(req, action, user, extra = {}) {
  const email = user?.email ?? extra.email ?? null;
  const summaries = {
    login: 'Signed in',
    login_failed: `Failed sign-in${email ? ` for ${email}` : ''}`,
    logout: 'Signed out',
    password_changed: 'Changed their password',
    password_reset: 'Reset their password with an email code',
  };
  return write({
    ...who(user),
    userEmail: email,
    action,
    area: 'account',
    summary: summaries[action] ?? action,
    method: req.method,
    path: req.originalUrl?.slice(0, 300),
    ...clientInfo(req),
  });
}

const VERBS = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };
const PAST = { create: 'Created', update: 'Changed', delete: 'Deleted' };

// The change the admin meant: a named record, not a child row or a bulk reorder.
const mainChange = (changes) => changes.find((c) => !c.many && c.name) ?? changes.find((c) => !c.many) ?? changes[0];

function summarize(changes, method, path) {
  const main = mainChange(changes);
  if (!main) return `${method} ${path}`.slice(0, 300);

  const name = main.name ? ` "${main.name}"` : '';
  let text = `${PAST[main.op]} ${main.many ? `${main.label}s` : main.label}${name}`;
  if (main.op === 'update' && main.fields) {
    const keys = Object.keys(main.fields);
    if (keys.length) text += `: ${keys.slice(0, 6).join(', ')}${keys.length > 6 ? '…' : ''}`;
  }
  const others = changes.length - 1;
  if (others > 0) text += ` (+${others} more change${others === 1 ? '' : 's'})`;
  return text.slice(0, 300);
}

/** Admin router middleware: logs every successful change made through the admin. */
export function auditAdminWrites(req, res, next) {
  const verb = VERBS[req.method];
  if (!verb) return next();

  const ctx = { changes: [] };
  const user = req.user;
  const area = (req.path.split('/')[1] || 'admin').slice(0, 40);

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    // Nothing saved (e.g. a preview or a lookup sent as POST): nothing to log.
    if (!ctx.changes.length && area !== 'uploads') return;

    const path = req.originalUrl.slice(0, 300);
    const action = mainChange(ctx.changes)?.op ?? 'action';
    write({
      ...who(user),
      action,
      area,
      summary: area === 'uploads' && !ctx.changes.length ? 'Uploaded a file' : summarize(ctx.changes, req.method, path),
      changes: ctx.changes.length ? ctx.changes : null,
      method: req.method,
      path,
      ...clientInfo(req),
    });
  });

  store.run(ctx, next);
}
