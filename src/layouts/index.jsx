import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'umi';
import styles from '../themes/terminal.less';
import { AppProvider, useApp } from '../contexts/appContext';
import { SqlConfigProvider } from '../contexts/SqlConfigContext';

const LayoutShell = () => {
  const { session, loading, sessionChecked, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!sessionChecked) {
      return;
    }
    if (!session && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [location.pathname, navigate, session, sessionChecked]);

  return (
    <div className={styles.wrapper}>
      {loading ? <div className={styles.loadingBar} /> : null}
      <header className={styles.topbar}>
        <ul className={styles.navs}>
          {/* <li>
            <Link to="/">Login</Link>
          </li> */}
          <li>
            <Link to={session?.sessionId ? `/${session.sessionId}` : '/'}>
              Home
            </Link>
          </li>
        </ul>
        <div className={styles.sessionStatus}>
          {loading ? <span className={styles.loadingText}>Loading...</span> : null}
          {session ? (
            <div className={styles.avatarWrapper}>
              <button className={styles.avatarButton} type="button">
                <span className={styles.avatarText}>
                  {session.username.slice(0, 2).toUpperCase()}
                </span>
              </button>
              <div className={styles.avatarMenu}>
                <div className={styles.avatarName}>{session.username}</div>
                <button className={styles.avatarAction} onClick={logout} type="button">
                  logout
                </button>
              </div>
            </div>
          ) : (
            <span className={styles.sessionText}>Not signed in</span>
          )}
        </div>
      </header>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};

export default function Layout() {
  return (
    <AppProvider>
      <SqlConfigProvider>
        <LayoutShell />
      </SqlConfigProvider>
    </AppProvider>
  );
}
