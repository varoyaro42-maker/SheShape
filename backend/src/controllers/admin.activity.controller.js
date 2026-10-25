import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { AuditLog, sequelize } from '../models/index.js';

const MAX_LIMIT = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTION_GROUPS = {
  logins: ['login', 'logout', 'password_changed', 'password_reset'],
  failed: ['login_failed'],
  changes: ['create', 'update', 'delete', 'action'],
};

/** The activity log, newest first, with filters for person, kind, area, dates and text. */
export const activity = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 50));
  const where = {};

  const userId = String(req.query.user || '').trim();
  if (userId) {
    if (!UUID_PATTERN.test(userId)) throw new HttpError(400, 'Unknown person filter.');
    where.userId = userId;
  }

  const kind = String(req.query.kind || '').trim();
  if (kind) {
    if (!ACTION_GROUPS[kind]) throw new HttpError(400, 'Unknown activity filter.');
    where.action = ACTION_GROUPS[kind];
  }

  const area = String(req.query.area || '').trim();
  if (area) where.area = area.slice(0, 40);

  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) throw new HttpError(400, 'Check the dates.');
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = from;
    // "to" is a day: include all of it.
    if (to) where.createdAt[Op.lt] = new Date(to.getTime() + 24 * 60 * 60 * 1000);
  }

  const search = String(req.query.search || '').trim();
  if (search) {
    const like = { [Op.like]: `%${search.slice(0, 100)}%` };
    where[Op.or] = [{ summary: like }, { userName: like }, { userEmail: like }, { ip: like }];
  }

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  res.json({ data: rows, meta: { page, limit, total: count, pages: Math.ceil(count / limit) || 1 } });
});

/** Everyone who appears in the log, for the person filter, and the areas used. */
export const activityPeople = asyncHandler(async (req, res) => {
  const [people, areas] = await Promise.all([
    AuditLog.findAll({
      attributes: ['userId', [sequelize.fn('MAX', sequelize.col('user_name')), 'userName'], [sequelize.fn('MAX', sequelize.col('user_email')), 'userEmail'], [sequelize.fn('MAX', sequelize.col('role')), 'role']],
      where: { userId: { [Op.ne]: null } },
      group: ['userId'],
      raw: true,
    }),
    AuditLog.findAll({ attributes: [[sequelize.fn('DISTINCT', sequelize.col('area')), 'area']], where: { area: { [Op.ne]: null } }, raw: true }),
  ]);

  res.json({
    data: {
      people: people.sort((a, b) => (a.role === b.role ? String(a.userName).localeCompare(String(b.userName)) : a.role === 'admin' ? -1 : 1)),
      areas: areas.map((a) => a.area).sort(),
    },
  });
});
