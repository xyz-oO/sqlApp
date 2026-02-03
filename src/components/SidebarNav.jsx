import { Link } from 'umi';
import { useSqlConfig } from '../contexts/SqlConfigContext';
import styles from '../themes/terminal.less';

export default function SidebarNav({
  userLabel = '用户管理',
  sqlLabel = 'SQL管理',
}) {
  const { sqlConfigs } = useSqlConfig();

  return (
    <nav className={styles.sidebarNav}>
      <Link className={styles.sidebarItem} to="/user-manager">
        {userLabel}
      </Link>
      <Link className={styles.sidebarItem} to="/sql-manager">
        {sqlLabel}
      </Link>
      <div className={styles.sidebarSeparator}></div>
      {sqlConfigs.map((config) => (
        <Link 
          key={config.id} 
          className={styles.sidebarItem} 
          to={`/sql/${config.id}`}
        >
          {config.menu_name}
        </Link>
      ))}
    </nav>
  );
}

