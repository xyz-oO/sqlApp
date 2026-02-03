import { createContext, useContext, useState, useEffect } from 'react';
import { request } from 'umi';
import { useApp } from './appContext';

const SqlConfigContext = createContext(null);

export function SqlConfigProvider({ children }) {
  const [sqlConfigs, setSqlConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { session, sessionChecked } = useApp();

  const loadSqlConfigs = async () => {
    if (!session?.sessionId) return;
    
    setLoading(true);
    try {
      const data = await request('/sql/config');
      setSqlConfigs(data?.configs || []);
    } catch (error) {
      console.error('Failed to load SQL configs:', error);
      setSqlConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionChecked && session?.sessionId) {
      loadSqlConfigs();
    }
  }, [session, sessionChecked]);

  const refreshSqlConfigs = async () => {
    await loadSqlConfigs();
  };

  return (
    <SqlConfigContext.Provider value={{ sqlConfigs, loading, refreshSqlConfigs }}>
      {children}
    </SqlConfigContext.Provider>
  );
}

export function useSqlConfig() {
  const context = useContext(SqlConfigContext);
  if (!context) {
    throw new Error('useSqlConfig must be used within a SqlConfigProvider');
  }
  return context;
}