import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationCenter from './NotificationCenter';
import AppLogo from './AppLogo';



function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function SidebarOpenIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  );
}

export default function Navbar({ sidebarCollapsed, onMenuClick, onSidebarToggle, onSearchClick }) {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();

  return (

    <>

      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 md:px-6 py-3 flex items-center justify-between gap-2">

        <button
          type="button"
          className="md:hidden p-2.5 min-h-[44px] min-w-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <MenuIcon />
        </button>

        {sidebarCollapsed && onSidebarToggle && (
          <button
            type="button"
            className="hidden md:flex p-2.5 min-h-[44px] min-w-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 items-center justify-center text-gray-700 dark:text-gray-200"
            onClick={onSidebarToggle}
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <SidebarOpenIcon />
          </button>
        )}

        <div className="md:hidden flex-shrink-0">
          <AppLogo size="sm" to="/attention" className="gap-2" />
        </div>

        <button

          type="button"

          onClick={onSearchClick}

          className="flex-1 max-w-md flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 hover:border-primary-300 transition-colors"

        >

          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">

            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

          </svg>

          <span className="truncate">Search clients, tasks…</span>

          <kbd className="hidden sm:inline ml-auto text-xs bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600">Ctrl K</kbd>

        </button>



        <div className="flex items-center gap-1 sm:gap-2">

          <NotificationCenter />

          <button

            type="button"

            onClick={toggle}

            className="p-2.5 min-h-[44px] min-w-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center"

            title={dark ? 'Light mode' : 'Dark mode'}

            aria-label="Toggle theme"

          >

            {dark ? (

              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />

              </svg>

            ) : (

              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />

              </svg>

            )}

          </button>

          <Link to="/settings" className="text-right hidden lg:block hover:opacity-80">

            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>

            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>

          </Link>

          <Link
            to="/settings"
            className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-semibold hover:bg-primary-700 min-h-[44px] min-w-[44px]"
            title="Settings"
          >
            {user?.name?.[0]?.toUpperCase()}
          </Link>
        </div>
      </header>
    </>

  );

}

