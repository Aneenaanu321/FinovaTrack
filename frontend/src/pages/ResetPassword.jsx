import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import AuthPageShell from '../components/AuthPageShell';
import PasswordHints from '../components/PasswordHints';
import { validatePasswordStrength } from '../constants/password';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid reset link. Request a new one.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    const pw = validatePasswordStrength(password);
    if (!pw.valid) {
      toast.error(pw.message);
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.resetPassword({ token, password });
      toast.success(res.data.message);
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthPageShell subtitle="Password reset">
        <p className="text-gray-700 dark:text-gray-300 mb-4 text-center">This reset link is invalid or missing.</p>
        <Link to="/forgot-password" className="btn-primary w-full inline-block text-center">Request a new link</Link>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell subtitle="Choose a new password">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Set new password</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
          />
          <PasswordHints password={password} />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
          <Link to="/login" className="text-primary-600 font-medium hover:underline">Back to sign in</Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
