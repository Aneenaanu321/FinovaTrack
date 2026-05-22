const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  notes: { type: String, required: true },
  loggedAt: { type: Date, default: Date.now },
  callRecorded: { type: Boolean, default: false },
  recordingDisclosed: { type: Boolean, default: false },
}, { _id: true });

const appointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  dateTime: { type: Date, required: true },
  durationMinutes: { type: Number, default: 60, min: 15, max: 480 },
  type: { type: String, enum: ['In-Person', 'Call', 'Video Call'], default: 'Call' },
  location: { type: String },
  notes: { type: String },
  status: { type: String, enum: ['Upcoming', 'Completed', 'Cancelled'], default: 'Upcoming' },
  remindEmail: { type: Boolean, default: true },
  remindSms: { type: Boolean, default: false },
  reminderEmailSentAt: { type: Date },
  reminderSmsSentAt: { type: Date },
  callLogs: [callLogSchema],
}, { timestamps: true });

appointmentSchema.index({ user: 1, dateTime: 1 });
appointmentSchema.index({ user: 1, status: 1, dateTime: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
