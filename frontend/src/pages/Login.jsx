import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useAppConfig } from '../context/AppConfigContext';
import AuthPageShell from '../components/AuthPageShell';
import PasswordHints from '../components/PasswordHints';
import { validatePasswordStrength } from '../constants/password';

export default function Login() {
  const { login, register } = useAuth();
  const { allowRegistration } = useAppConfig();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (mode === 'register') {
      const pw = validatePasswordStrength(form.password);
      if (!pw.valid) {
        toast.error(pw.message);
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        await register(form.name, form.email, form.password);
        toast.success('Account created!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
        {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
      </h2>
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label className="label">Full Name</label>
            <input name="name" value={form.name} onChange={handle} className="input" placeholder="John Smith" required />
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" value={form.email} onChange={handle} className="input" placeholder="you@bank.com" required />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Password</label>
            {mode === 'login' && (
              <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">
                Forgot password?
              </Link>
            )}
          </div>
          <input name="password" type="password" value={form.password} onChange={handle} className="input" placeholder="••••••••" required />
          {mode === 'register' && <PasswordHints password={form.password} />}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
      {allowRegistration ? (
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-6">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" className="text-primary-600 font-medium hover:underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      ) : mode === 'register' ? (
        <p className="text-sm text-center text-amber-700 dark:text-amber-400 mt-6">
          Registration is disabled on this server.{' '}
          <button type="button" className="text-primary-600 font-medium hover:underline" onClick={() => setMode('login')}>
            Sign in
          </button>
        </p>
      ) : null}
    </AuthPageShell>
  );
}
