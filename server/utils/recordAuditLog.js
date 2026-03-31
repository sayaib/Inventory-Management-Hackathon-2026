const AuditLog = require('../models/AuditLog');

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

const recordAuditLog = async ({ req, actor, action, entityType, entityId, details }) => {
  if (!action) return;

  const resolvedActor = actor || resolveActorFromReq(req);
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
      detailsText: safeStringify(details || {}),
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
