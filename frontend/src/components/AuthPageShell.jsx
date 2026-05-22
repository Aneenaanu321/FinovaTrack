import React from 'react';
import AppLogo from './AppLogo';

/**
 * Shared full-screen shell for login / password flows.
 */
export default function AuthPageShell({ children, title = 'FinovaTrack', subtitle = 'Bank Sales Productivity Tool' }) {
  return (
    <div className="auth-page relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="auth-page__glow auth-page__glow--1" aria-hidden />
      <div className="auth-page__glow auth-page__glow--2" aria-hidden />
      <div className="auth-page__glow auth-page__glow--3" aria-hidden />
      <div className="auth-page__grid" aria-hidden />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <AppLogo
            size="lg"
            subtitle={subtitle}
            nameClassName="!text-white drop-shadow-sm"
            subtitleClassName="text-sky-200/90"
          />
        </div>
        {title !== 'FinovaTrack' && (
          <h1 className="text-xl font-semibold text-white text-center -mt-4 mb-6">{title}</h1>
        )}
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-slate-900/40 border border-white/30 dark:border-gray-700/50 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
