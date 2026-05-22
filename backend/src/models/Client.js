const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: { type: String, enum: ['call', 'note', 'status_change', 'contact'], required: true },
  title: { type: String, required: true },
  body: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

const clientSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  notes: { type: String },
  productType: {
    type: String,
    enum: ['Savings', 'Loan', 'Credit Card', 'Insurance', 'Investment', 'Other', ''],
    default: '',
  },
  dealValue: { type: Number, min: 0 },
  expectedCommission: { type: Number, min: 0 },
  leadSource: {
    type: String,
    enum: ['Referral', 'Walk-in', 'Campaign', 'Website', 'Other', ''],
    default: '',
  },
  lastContactedAt: { type: Date },
  kycStatus: { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' },
  kycDocuments: {
    id: { type: Boolean, default: false },
    addressProof: { type: Boolean, default: false },
    income: { type: Boolean, default: false },
  },
  dealStatus: { type: String, enum: ['New', 'Contacted', 'Interested', 'Closed'], default: 'New' },
  nextAction: { type: String },
  activities: [activitySchema],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

clientSchema.index({ user: 1, name: 1 });
clientSchema.index({ user: 1, deletedAt: 1 });
clientSchema.index({ user: 1, email: 1 });
clientSchema.index({ user: 1, phone: 1 });

module.exports = mongoose.model('Client', clientSchema);
module.exports.STALE_LEAD_DAYS = 14;
