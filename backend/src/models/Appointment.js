const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  dateTime: { type: Date, required: true },
  type: { type: String, enum: ['In-Person', 'Call', 'Video Call'], default: 'Call' },
  location: { type: String },
  notes: { type: String },
  status: { type: String, enum: ['Upcoming', 'Completed', 'Cancelled'], default: 'Upcoming' },
}, { timestamps: true });

appointmentSchema.index({ user: 1, dateTime: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
