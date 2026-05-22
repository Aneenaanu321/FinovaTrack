const express = require('express');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const { TASK_TEMPLATES } = require('../constants/taskTemplates');
const { nextDueDate } = require('../utils/recurring');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
router.use(auth);

const SORT_FIELDS = {
  dueDate: 'dueDate',
  priority: 'priority',
  title: 'title',
  createdAt: 'createdAt',
  status: 'status',
};

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

function buildFilter(userId, query) {
  const { status, priority, clientId, dueFrom, dueTo, search } = query;
  const filter = { user: userId };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (clientId) filter.client = clientId;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  if (dueFrom || dueTo) {
    filter.dueDate = {};
    if (dueFrom) filter.dueDate.$gte = new Date(dueFrom);
    if (dueTo) {
      const end = new Date(dueTo);
      end.setHours(23, 59, 59, 999);
      filter.dueDate.$lte = end;
    }
  }
  return filter;
}

function buildSort(sortBy, sortDir) {
  const field = SORT_FIELDS[sortBy] || 'dueDate';
  const dir = sortDir === 'desc' ? -1 : 1;
  if (field === 'priority') {
    return null;
  }
  return { [field]: dir, createdAt: -1 };
}

async function spawnRecurringTask(task) {
  if (!task.recurringFrequency || !task.dueDate) return null;
  const baseDue = task.dueDate;
  const newDue = nextDueDate(baseDue, task.recurringFrequency);
  const {
    user, client, title, description, priority,
    recurringFrequency, emailReminderEnabled, emailReminderHoursBefore, browserReminderEnabled,
  } = task;
  return Task.create({
    user,
    client,
    title,
    description,
    dueDate: newDue,
    priority,
    status: 'Pending',
    recurringFrequency,
    emailReminderEnabled,
    emailReminderHoursBefore,
    browserReminderEnabled,
    recurringParent: task._id,
  });
}

async function completeTaskById(userId, taskId) {
  const task = await Task.findOne({ _id: taskId, user: userId });
  if (!task) return null;
  task.status = 'Completed';
  task.completedAt = new Date();
  await task.save();
  if (task.recurringFrequency) {
    await spawnRecurringTask(task);
  }
  return Task.findById(task._id).populate('client', 'name');
}

router.get('/templates', (req, res) => {
  res.json(TASK_TEMPLATES);
});

router.get('/', async (req, res) => {
  try {
    const filter = buildFilter(req.user.id, req.query);
    const { sortBy = 'dueDate', sortDir = 'asc', page, limit } = req.query;

    let query = Task.find(filter).populate('client', 'name');

    if (sortBy === 'priority') {
      const dir = sortDir === 'desc' ? -1 : 1;
      const tasks = await query.lean();
      tasks.sort((a, b) => {
        const diff = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
        return diff * dir;
      });
      if (page) {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const total = tasks.length;
        const start = (pageNum - 1) * limitNum;
        return res.json({
          tasks: tasks.slice(start, start + limitNum),
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum) || 1,
        });
      }
      return res.json(tasks);
    }

    const sort = buildSort(sortBy, sortDir);
    query = query.sort(sort);

    if (page) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const total = await Task.countDocuments(filter);
      const tasks = await query.skip((pageNum - 1) * limitNum).limit(limitNum);
      return res.json({
        tasks,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      });
    }

    if (limit && !page) {
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
      const tasks = await query.limit(limitNum);
      return res.json(tasks);
    }

    const tasks = await query;
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      title, description, dueDate, priority, status, client,
      recurringFrequency, emailReminderEnabled, emailReminderHoursBefore, browserReminderEnabled,
    } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const task = await Task.create({
      user: req.user.id,
      title,
      description,
      dueDate,
      priority,
      status,
      client: client || null,
      recurringFrequency: recurringFrequency || null,
      emailReminderEnabled: !!emailReminderEnabled,
      emailReminderHoursBefore: emailReminderHoursBefore ?? 24,
      browserReminderEnabled: !!browserReminderEnabled,
    });
    await task.populate('client', 'name');
    await recordAudit(req, {
      action: 'create',
      entityType: 'task',
      entityId: task._id,
      entityLabel: task.title,
      changes: [{ field: 'title', from: null, to: task.title }],
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/bulk/complete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array is required' });
    }
    const results = [];
    for (const id of ids) {
      const task = await completeTaskById(req.user.id, id);
      if (task) results.push(task);
    }
    res.json({ completed: results.length, tasks: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array is required' });
    }
    const result = await Task.deleteMany({ _id: { $in: ids }, user: req.user.id });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.status === 'Completed' && !update.completedAt) update.completedAt = new Date();
    if (update.status === 'Pending') update.completedAt = null;
    if (update.dueDate !== undefined) update.emailReminderSentAt = null;
    if (update.recurringFrequency === '') update.recurringFrequency = null;
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      update,
      { new: true, runValidators: true }
    ).populate('client', 'name');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await recordAudit(req, {
      action: 'update',
      entityType: 'task',
      entityId: task._id,
      entityLabel: task.title,
      changes: [{ field: 'update', from: null, to: 'modified' }],
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await recordAudit(req, {
      action: 'delete',
      entityType: 'task',
      entityId: task._id,
      entityLabel: task.title,
      changes: [{ field: 'deleted', from: task.title, to: null }],
    });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/complete', async (req, res) => {
  try {
    const task = await completeTaskById(req.user.id, req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
