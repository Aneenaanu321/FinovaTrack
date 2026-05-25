import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const defaults = {
  allowRegistration: true,
  defaultHomeRoute: '/attention',
  emailNotificationsAvailable: false,
  loaded: false,
};

const AppConfigContext = createContext(defaults);

export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState(defaults);

  useEffect(() => {
    api.get('/config/public')
      .then((res) => setConfig({ ...res.data, loaded: true }))
      .catch(() => setConfig((c) => ({ ...c, loaded: true })));
  }, []);

  return (
    <AppConfigContext.Provider value={config}>
      {children}
    </AppConfigContext.Provider>
  );
}

export const useAppConfig = () => useContext(AppConfigContext);
