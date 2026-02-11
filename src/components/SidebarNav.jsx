import { useState } from 'react';
import { Link } from 'umi';
import { useSqlConfig } from '../contexts/SqlConfigContext';
import { useApp } from '../contexts/appContext';
import styles from '../themes/terminal.less';

export default function SidebarNav({
  userLabel = '用户管理',
  sqlLabel = 'SQL管理',
}) {
  const { sqlConfigs } = useSqlConfig();
  const { session } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const emojis=['👾','💭','🐡','🦓','🐴','🍄']

  const getRandomEmoji = () => {
    const index = Math.floor(Math.random() * emojis.length);
    return emojis[index];
  };

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <span>System</span>
        <button
          className={styles.sidebarToggle}
          type="button"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? '>' : '<'}
        </button>
      </div>
      <nav className={styles.sidebarNav}>
        {session?.role === 'SUPER' && (
          <Link className={styles.sidebarItem} to="/user-manager">
            {collapsed ? '💀' : userLabel}
          </Link>
        )}
        <Link className={styles.sidebarItem} to="/sql-manager">
          {collapsed ? '🧠' : sqlLabel}
        </Link>
        <div className={styles.sidebarSeparator}></div>
        {sqlConfigs.map((config) => (
          <Link 
            key={config.id} 
            className={styles.sidebarItem} 
            to={`/sql/${config.id}`}
          >
            {collapsed ? getRandomEmoji() : config.menu_name}
          </Link>
        ))}
      </nav>
    </div>
  );
}

