const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return '';
  }
};

const resolveActorFromReq = (req) => {
  const user = req?.user || {};
  return {
    userId: user.id,
    username: user.username || '',
    email: user.email || '',
    role: user.role || ''
  };
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const HIDDEN_USER_EMAIL = normalizeEmail(process.env.ADMIN_EMAIL);

const shouldHideAuditLog = async ({ actor, entityType, entityId, detailsText }) => {
  if (!HIDDEN_USER_EMAIL) return false;
  if (normalizeEmail(actor?.email) === HIDDEN_USER_EMAIL) return true;
  if (detailsText && normalizeEmail(detailsText).includes(HIDDEN_USER_EMAIL)) return true;

  if (entityType === 'User' && entityId) {
    try {
      const isHiddenTarget = await User.exists({ _id: entityId, email: HIDDEN_USER_EMAIL });
      if (isHiddenTarget) return true;
    } catch (e) {
      return false;
    }
  }

  return false;
};

const recordAuditLog = async ({ req, actor, action, entityType, entityId, details }) => {
  if (!action) return;

  const resolvedActor = actor || resolveActorFromReq(req);
  const detailsText = safeStringify(details || {});
  if (await shouldHideAuditLog({ actor: resolvedActor, entityType, entityId, detailsText })) return;
  const ip =
    (req?.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) ||
    req?.ip ||
    '';
  const userAgent = (req?.headers && req.headers['user-agent']) || '';

  try {
    const payload = {
      actor: resolvedActor,
      action,
      entity: {
        type: entityType || '',
        id: entityId ? String(entityId) : ''
      },
      details: details || {},
      detailsText,
      ip: Array.isArray(ip) ? ip[0] : String(ip || ''),
      userAgent: String(userAgent || ''),
      occurredAt: new Date()
    };

    const log = new AuditLog(payload);
    await log.save();
  } catch (error) {
    return;
  }
};

module.exports = { recordAuditLog };
