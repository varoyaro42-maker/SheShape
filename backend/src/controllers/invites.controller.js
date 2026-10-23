import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { sequelize, User, AdminInvite } from '../models/index.js';
import { hashInviteToken } from '../models/AdminInvite.js';
import { signToken, setAuthCookie } from '../utils/token.js';

async function findOpenInvite(token) {
  const invite = await AdminInvite.findOne({
    where: { tokenHash: hashInviteToken(token), acceptedAt: null, expiresAt: { [Op.gt]: new Date() } },
  });
  if (!invite) throw new HttpError(404, 'This invite link is invalid or has expired. Ask an admin to send a new one.');
  return invite;
}

/** What the accept page needs to show: who the invite is for and whether they already have an account. */
export const lookup = asyncHandler(async (req, res) => {
  const invite = await findOpenInvite(req.params.token);
  const hasAccount = Boolean(await User.findOne({ where: { email: invite.email }, attributes: ['id'] }));
  res.json({ data: { email: invite.email, name: invite.name, hasAccount } });
});

/**
 * New people set name, phone and password; people who already have a
 * customer account confirm with their existing password.
 */
export const accept = asyncHandler(async (req, res) => {
  const invite = await findOpenInvite(req.params.token);
  const password = String(req.body?.password ?? '');

  const user = await sequelize.transaction(async (transaction) => {
    let account = await User.scope('withPassword').findOne({ where: { email: invite.email }, transaction });

    if (account) {
      if (!(await account.checkPassword(password))) throw new HttpError(401, 'That password does not match your existing account');
      account.role = 'admin';
      account.isVerified = true;
      await account.save({ transaction });
    } else {
      account = await User.create(
        {
          name: String(req.body?.name ?? invite.name ?? '').trim(),
          email: invite.email,
          phone: req.body?.phone,
          password,
          role: 'admin',
          isVerified: true,
        },
        { transaction }
      );
    }

    invite.acceptedAt = new Date();
    await invite.save({ transaction });
    return account;
  });

  setAuthCookie(res, signToken(user));
  const fresh = await User.findByPk(user.id);
  res.json({ data: fresh });
});
