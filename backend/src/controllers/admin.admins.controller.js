import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { User, AdminInvite } from '../models/index.js';
import { INVITE_DAYS, hashInviteToken, newInviteToken } from '../models/AdminInvite.js';
import { sendAdminInviteEmail, clientUrl } from '../utils/emails.js';

const ownerEmail = () => (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

async function issueInvite(invite, inviter) {
  const token = newInviteToken();
  invite.tokenHash = hashInviteToken(token);
  invite.expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
  await invite.save();

  await sendAdminInviteEmail({
    to: invite.email,
    name: invite.name,
    invitedBy: inviter?.name,
    acceptUrl: clientUrl(`/invite/${token}`),
    expiresDays: INVITE_DAYS,
  });
  return invite;
}

const inviteView = (invite) => ({
  id: invite.id,
  email: invite.email,
  name: invite.name,
  expiresAt: invite.expiresAt,
  expired: invite.expiresAt < new Date(),
  createdAt: invite.createdAt,
  invitedBy: invite.invitedBy?.name ?? null,
});

export const list = asyncHandler(async (req, res) => {
  const [admins, invites] = await Promise.all([
    User.findAll({ where: { role: 'admin' }, attributes: ['id', 'name', 'email', 'isClinical', 'createdAt'], order: [['createdAt', 'ASC']] }),
    AdminInvite.findAll({
      where: { acceptedAt: null },
      include: [{ model: User, as: 'invitedBy', attributes: ['name'] }],
      order: [['createdAt', 'DESC']],
    }),
  ]);

  res.json({
    data: {
      admins: admins.map((admin) => ({
        ...admin.toJSON(),
        isYou: admin.id === req.user.id,
        isOwner: admin.email === ownerEmail(),
      })),
      invites: invites.map(inviteView),
    },
  });
});

export const invite = asyncHandler(async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const name = String(req.body?.name ?? '').trim().slice(0, 80) || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Enter a valid email address', [{ field: 'email', message: 'Enter a valid email address' }]);
  }

  const existing = await User.findOne({ where: { email } });
  if (existing?.role === 'admin') throw new HttpError(409, 'That person is already an admin');

  const [record] = await AdminInvite.findOrBuild({
    where: { email, acceptedAt: null },
    defaults: { email, name, tokenHash: 'pending', expiresAt: new Date(), invitedById: req.user.id },
  });
  if (name) record.name = name;
  record.invitedById = req.user.id;

  await issueInvite(record, req.user);
  res.status(201).json({ data: inviteView(record) });
});

export const resend = asyncHandler(async (req, res) => {
  const record = await AdminInvite.findOne({ where: { id: req.params.id, acceptedAt: null } });
  if (!record) throw new HttpError(404, 'Invite not found');
  await issueInvite(record, req.user);
  res.json({ data: inviteView(record) });
});

export const revoke = asyncHandler(async (req, res) => {
  const removed = await AdminInvite.destroy({ where: { id: req.params.id, acceptedAt: null } });
  if (!removed) throw new HttpError(404, 'Invite not found');
  res.status(204).end();
});

/** Takes admin rights away; the person keeps a normal customer account. */
export const removeAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ where: { id: req.params.id, role: 'admin' } });
  if (!admin) throw new HttpError(404, 'Admin not found');
  if (admin.id === req.user.id) throw new HttpError(400, 'You cannot remove yourself. Ask another admin to do it.');
  if (admin.email === ownerEmail()) {
    throw new HttpError(400, 'This is the main account set on the server (ADMIN_EMAIL). Change it there first.');
  }
  const others = await User.count({ where: { role: 'admin', id: { [Op.ne]: admin.id } } });
  if (!others) throw new HttpError(400, 'There must always be at least one admin');

  admin.role = 'user';
  await admin.save();
  res.status(204).end();
});

/** Medical access: may read the health answers on event registrations. */
export const setClinical = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ where: { id: req.params.id, role: 'admin' } });
  if (!admin) throw new HttpError(404, 'Admin not found');
  admin.isClinical = req.body?.isClinical === true;
  await admin.save();
  res.json({ data: { id: admin.id, isClinical: admin.isClinical } });
});
