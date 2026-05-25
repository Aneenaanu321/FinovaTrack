import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function useKeyboardShortcuts({ onSearch, onHelp }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearch?.();
        return;
      }

      if (e.key === '?' && !typing) {
        e.preventDefault();
        onHelp?.();
        return;
      }

      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      const routes = {
        d: '/dashboard',
        n: '/attention',
        c: '/clients',
        p: '/pipeline',
        t: '/tasks',
        a: '/appointments',
        s: '/settings',
      };
      if (routes[e.key]) {
        e.preventDefault();
        navigate(routes[e.key]);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, onSearch, onHelp]);
}
