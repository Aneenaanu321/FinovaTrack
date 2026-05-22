import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import AuthPageShell from '../components/AuthPageShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setSent(true);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell subtitle="Reset your password">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Forgot password</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Enter your email and we will send you a reset link. In local dev, check the backend console if SMTP is not configured.
      </p>
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            If an account exists for that email, reset instructions have been sent (or logged on the server).
          </p>
          <Link to="/login" className="btn-primary w-full inline-block text-center">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@bank.com"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400">
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthPageShell>
  );
}
