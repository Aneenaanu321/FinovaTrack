import React from 'react';
import { validatePasswordStrength } from '../constants/password';

export default function PasswordHints({ password }) {
  const { rules } = validatePasswordStrength(password || '');
  if (!rules.length) return null;
  return (
    <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mt-2">
      {rules.map((r) => (
        <li key={r.id} className={r.met ? 'text-green-600 dark:text-green-400' : ''}>
          {r.met ? '✓' : '○'} {r.message}
        </li>
      ))}
    </ul>
  );
}
