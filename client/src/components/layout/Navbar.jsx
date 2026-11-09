import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';

export const Navbar = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
          aria-label="Toggle navigation menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white md:hidden">
          Referral<span className="text-brand-600 dark:text-brand-400">Circle</span>
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </button>

        {/* User Badge */}
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || 'User avatar'}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200 object-cover dark:border-slate-700"
            />
          ) : (
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-slate-800 leading-tight dark:text-slate-100">{user?.name}</p>
            <p className="text-xs text-slate-500 leading-tight dark:text-slate-400">{user?.email}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          aria-label="Sign out"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
          title="Sign out"
        >
          <LogOut className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
