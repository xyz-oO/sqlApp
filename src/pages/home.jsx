import { useState } from 'react';
import { Link } from 'umi';
import { useApp } from '../contexts/appContext';
import styles from '../themes/terminal.less';
import SidebarNav from '../components/SidebarNav';

export default function HomeDashboard() {
  const { session } = useApp();

  return (
    <>
      <div className={styles.dashboard}>
        <SidebarNav userLabel="用户管理" sqlLabel="SQL管理" />
        <section className={styles.dashboardContent}>
          <h2 className={styles.dashboardTitle}>logined home</h2>
          <p className={styles.dashboardSubtitle}>
            {session ? `active session: ${session.username}` : 'no active session'}
          </p>
          <div className={styles.dashboardPanel}>
            <p>$ echo "Welcome to the dashboard"</p>
          </div>
        </section>
      </div>
      <footer className={styles.footer}>
        <p>This web platform is developed by PT, for internal management use only by authorized personnel.</p>
      </footer>
    </>
  );
}

