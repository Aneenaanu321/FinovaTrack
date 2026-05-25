const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const registerBody = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  branch: z.string().max(120).optional(),
  employeeId: z.string().max(80).optional(),
});

const loginBody = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, 'Password is required'),
});

const refreshBody = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const forgotPasswordBody = z.object({
  email: z.string().trim().email(),
});

const resetPasswordBody = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const profileBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
  branch: z.string().max(120).optional(),
  employeeId: z.string().max(80).optional(),
});

const changePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const clientCreateBody = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(5000).optional(),
  productType: z.string().max(50).optional(),
  dealValue: z.coerce.number().min(0).optional(),
  expectedCommission: z.coerce.number().min(0).optional(),
  leadSource: z.string().max(50).optional(),
  kycStatus: z.enum(['Not Started', 'In Progress', 'Completed']).optional(),
  dealStatus: z.enum(['New', 'Contacted', 'Interested', 'Closed']).optional(),
  nextAction: z.string().max(500).optional(),
  lastContactedAt: z.union([z.string(), z.date()]).optional(),
  nextFollowUpDate: z.union([z.string(), z.date(), z.null()]).optional(),
}).passthrough();

const taskCreateBody = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  description: z.string().max(5000).optional(),
  dueDate: z.union([z.string(), z.date()]).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  client: objectId.optional().nullable(),
  recurringFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  emailReminderEnabled: z.boolean().optional(),
  emailReminderHoursBefore: z.coerce.number().min(1).max(168).optional(),
  browserReminderEnabled: z.boolean().optional(),
}).passthrough();

const registerSchema = z.object({ body: registerBody });
const loginSchema = z.object({ body: loginBody });
const refreshSchema = z.object({ body: refreshBody });
const forgotPasswordSchema = z.object({ body: forgotPasswordBody });
const resetPasswordSchema = z.object({ body: resetPasswordBody });
const profileSchema = z.object({ body: profileBody });
const changePasswordSchema = z.object({ body: changePasswordBody });
const clientCreateSchema = z.object({ body: clientCreateBody });
const taskCreateSchema = z.object({ body: taskCreateBody });
const appointmentCreateBody = z.object({
  client: objectId,
  dateTime: z.union([z.string(), z.date()]),
  type: z.enum(['In-Person', 'Call', 'Video Call']).optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  durationMinutes: z.coerce.number().min(5).max(480).optional(),
  remindEmail: z.boolean().optional(),
  remindSms: z.boolean().optional(),
});

const appointmentCreateSchema = z.object({ body: appointmentCreateBody });
const idParamSchema = z.object({ params: z.object({ id: objectId }) });

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileSchema,
  changePasswordSchema,
  clientCreateSchema,
  taskCreateSchema,
  appointmentCreateSchema,
  idParamSchema,
};
