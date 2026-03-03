import { useEffect } from 'react';
import { useNavigate } from 'umi';
import styles from '../themes/terminal.less';

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto redirect to login page after 5 seconds
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className={styles.wrapper} style={{ minHeight: '100vh' }}>
      <div className={styles.content} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className={styles.dashboardContent} style={{ textAlign: 'center', padding: '40px 24px', maxWidth: '600px' }}>
          <h1 className={`${styles.dashboardTitle} ${styles.notFoundTitle}`}>404</h1>
          <div className={styles.notFoundSubtitle}>
            页面不存在
          </div>
          <div className={styles.notFoundDescription}>
            您访问的页面不存在或已被删除
          </div>
          <div className={styles.notFoundRedirect}>
            将在 5 秒后自动跳转至登录页面...
          </div>
          <div style={{ marginTop: '48px' }}>
            <button 
              className={styles.terminalButton}
              onClick={() => navigate('/login')}
            >
              立即跳转
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
