import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';

export function LogoutIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}

export default function LogoutButton({ variant = 'sidebar', onAction }) {
  const { logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const confirmLogout = async () => {
    setLogoutOpen(false);
    onAction?.();
    await logout();
  };

  const isSidebar = variant === 'sidebar';
  const isCollapsedSidebar = variant === 'sidebar-collapsed';

  return (
    <>
      <button
        type="button"
        onClick={() => setLogoutOpen(true)}
        title="Sign out"
        aria-label="Sign out"
        className={
          isSidebar || isCollapsedSidebar
            ? `flex items-center rounded-lg text-sm font-medium transition-colors min-h-[44px] w-full text-gray-600 hover:bg-gray-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-red-400 ${
                isCollapsedSidebar ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-3'
              }`
            : 'btn-secondary inline-flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-200 dark:border-red-900/50'
        }
      >
        <LogoutIcon />
        {!isCollapsedSidebar && <span>Sign out</span>}
      </button>

      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)} title="Sign out?">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          You will need to sign in again to access your data.
        </p>
        <div className="flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => setLogoutOpen(false)}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={confirmLogout}>
            Sign out
          </button>
        </div>
      </Modal>
    </>
  );
}
