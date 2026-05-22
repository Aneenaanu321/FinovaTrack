const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  dueDate: { type: Date },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  completedAt: { type: Date },
  recurringFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
  emailReminderEnabled: { type: Boolean, default: false },
  emailReminderHoursBefore: { type: Number, default: 24, min: 1, max: 168 },
  browserReminderEnabled: { type: Boolean, default: false },
  emailReminderSentAt: { type: Date },
  recurringParent: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
}, { timestamps: true });

taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, emailReminderEnabled: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
