const express = require('express');
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { status, from, to, clientId } = req.query;
    const filter = { user: req.user.id };
    if (status) filter.status = status;
    if (clientId) filter.client = clientId;
    if (from || to) {
      filter.dateTime = {};
      if (from) filter.dateTime.$gte = new Date(from);
      if (to) filter.dateTime.$lte = new Date(to);
    }
    const appointments = await Appointment.find(filter).populate('client', 'name phone email').sort({ dateTime: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { client, dateTime, type, location, notes } = req.body;
    if (!client || !dateTime)
      return res.status(400).json({ message: 'Client and dateTime are required' });
    const appointment = await Appointment.create({ user: req.user.id, client, dateTime, type, location, notes });
    await appointment.populate('client', 'name phone email');
    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    ).populate('client', 'name phone email');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
