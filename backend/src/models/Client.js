const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  notes: { type: String },
  kycStatus: { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' },
  dealStatus: { type: String, enum: ['New', 'Contacted', 'Interested', 'Closed'], default: 'New' },
  nextAction: { type: String },
}, { timestamps: true });

clientSchema.index({ user: 1, name: 1 });

module.exports = mongoose.model('Client', clientSchema);
