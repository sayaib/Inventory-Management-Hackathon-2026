const express = require('express');
const AuditLog = require('../models/AuditLog');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const { action, actorUserId, actorEmail, actorUsername, startDate, endDate, search, limit = 25, page = 1 } =
      req.query || {};

    const parsedLimit = Math.min(200, Math.max(1, Number(limit)));
    const parsedPage = Math.max(1, Number(page));
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};

    if (action) query.action = action;
    if (actorUserId) query['actor.userId'] = actorUserId;
    if (actorEmail) query['actor.email'] = { $regex: actorEmail, $options: 'i' };
    if (actorUsername) query['actor.username'] = { $regex: actorUsername, $options: 'i' };

    if (startDate || endDate) {
      query.occurredAt = {};
      if (startDate) query.occurredAt.$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.occurredAt.$lte = endOfDay;
      }
    }

    if (search) {
      const rx = { $regex: search, $options: 'i' };
      query.$or = [
        { action: rx },
        { 'actor.username': rx },
        { 'actor.email': rx },
        { 'actor.role': rx },
        { 'entity.type': rx },
        { 'entity.id': rx },
        { detailsText: rx }
      ];
    }

    const [logs, totalLogs] = await Promise.all([
      AuditLog.find(query).sort({ occurredAt: -1, createdAt: -1 }).skip(skip).limit(parsedLimit),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      logs,
      totalPages: Math.ceil(totalLogs / parsedLimit),
      currentPage: parsedPage,
      totalLogs
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch audit logs', error: error.message });
  }
});

module.exports = router;
