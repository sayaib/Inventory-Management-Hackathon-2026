const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: { type: String, default: '' },
      email: { type: String, default: '' },
      role: { type: String, default: '' }
    },
    action: {
      type: String,
      required: true
    },
    entity: {
      type: { type: String, default: '' },
      id: { type: String, default: '' }
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    detailsText: {
      type: String,
      default: ''
    },
    ip: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    occurredAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
