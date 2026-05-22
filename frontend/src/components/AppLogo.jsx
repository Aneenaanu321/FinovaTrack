import React from 'react';
import { Link } from 'react-router-dom';

/** Chart / growth mark — sales pipeline tracker (replaces currency $ icon). */
export function LogoMark({ size = 'md', className = '' }) {
  const box = { sm: 'w-9 h-9 rounded-lg', md: 'w-10 h-10 rounded-xl', lg: 'w-14 h-14 rounded-2xl' }[size];
  const icon = { sm: 'w-5 h-5', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];

  return (
    <div
      className={`${box} bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-600/30 flex-shrink-0 ${className}`}
      aria-hidden
    >
      <svg className={`${icon} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 15l3-4 3 3 4-6 3 7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5" opacity={0.35} />
      </svg>
    </div>
  );
}

/**
 * Brand block: icon + FinovaTrack name (optional subtitle).
 */
export default function AppLogo({
  size = 'md',
  subtitle,
  to,
  className = '',
  nameClassName = '',
  subtitleClassName = '',
}) {
  const nameSize = {
    sm: 'text-base font-bold',
    md: 'text-lg font-bold',
    lg: 'text-2xl font-bold tracking-tight',
  }[size];

  const inner = (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark size={size} />
      <div className="min-w-0 text-left">
        <span className={`block text-gray-900 dark:text-gray-100 ${nameSize} ${nameClassName}`}>
          FinovaTrack
        </span>
        {subtitle && (
          <p className={`text-xs mt-0.5 truncate ${subtitleClassName || 'text-gray-500 dark:text-gray-400'}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    );
  }

  return inner;
}
