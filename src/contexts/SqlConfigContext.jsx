import { createContext, useContext, useState, useEffect } from 'react';
import { useApp } from './appContext';
import { ConfigService } from '../services/ConfigService';

const SqlConfigContext = createContext(null);

export function SqlConfigProvider({ children }) {
  const [sqlConfigs, setSqlConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { session, sessionChecked } = useApp();

  const loadSqlConfigs = async () => {
    if (!session?.sessionId) return;
    
    setLoading(true);
    try {
      const sqlConfigs = await ConfigService.getSqlConfigs();
      
      setSqlConfigs(sqlConfigs);
    } catch (error) {
      console.error('Failed to load SQL configs:', error);
      setSqlConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionChecked && session?.username) {
      loadSqlConfigs();
    }
  }, [session?.username, sessionChecked]);

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