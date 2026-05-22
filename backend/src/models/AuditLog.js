const mongoose = require('mongoose');

const changeSchema = new mongoose.Schema({
  field: { type: String, required: true },
  from: { type: mongoose.Schema.Types.Mixed },
  to: { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userName: { type: String },
  userEmail: { type: String },
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'restore', 'soft_delete'],
    required: true,
  },
  entityType: {
    type: String,
    enum: ['client', 'task', 'appointment', 'user'],
    required: true,
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
  entityLabel: { type: String },
  changes: [changeSchema],
  ip: { type: String },
  userAgent: { type: String },
}, { timestamps: true });

auditLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
