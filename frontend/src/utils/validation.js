export function validateClientForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Name is required';
  if (form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (form.phone?.trim() && !/^[\d\s+\-().]{7,}$/.test(form.phone.trim())) {
    errors.phone = 'Enter a valid phone number';
  }
  return errors;
}

export function validateTaskForm(form) {
  const errors = {};
  if (!form.title?.trim()) errors.title = 'Title is required';
  return errors;
}

export function validateAppointmentForm(form) {
  const errors = {};
  if (!form.client) errors.client = 'Select a client';
  if (!form.dateTime) errors.dateTime = 'Date and time are required';
  return errors;
}

export function validateProfileForm(profile) {
  const errors = {};
  if (!profile.name?.trim()) errors.name = 'Name is required';
  if (!profile.email?.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  return errors;
}

import { validatePasswordStrength } from '../constants/password';

export function validatePasswordForm({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};
  if (!currentPassword) errors.currentPassword = 'Current password is required';
  if (!newPassword) errors.newPassword = 'New password is required';
  else {
    const pw = validatePasswordStrength(newPassword);
    if (!pw.valid) errors.newPassword = pw.message;
  }
  if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
}
