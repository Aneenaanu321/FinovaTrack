function nextDueDate(fromDate, frequency) {
  const d = new Date(fromDate);
  if (frequency === 'daily') d.setDate(d.getDate() + 1);
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  return d;
}

module.exports = { nextDueDate };
