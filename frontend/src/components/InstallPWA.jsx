import React, { useEffect, useState } from 'react';

export default function InstallPWA() {
  const [prompt, setPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-dismissed') === '1');
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onInstalled = () => setInstalled(true);
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
    return () => {
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
    setDismissed(true);
    localStorage.setItem('pwa-dismissed', '1');
  };

  if (installed || dismissed || !prompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 card shadow-lg border-primary-100 dark:border-primary-900 p-4">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Install FinovaTrack</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add to your home screen for quick access on mobile.</p>
      <div className="flex gap-2 mt-3">
        <button type="button" className="btn-primary text-sm flex-1" onClick={install}>Install</button>
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => { setDismissed(true); localStorage.setItem('pwa-dismissed', '1'); }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
