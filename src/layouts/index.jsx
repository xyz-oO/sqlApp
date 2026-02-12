import { useEffect, useState } from 'react';
import { Link, Outlet, request, useLocation, useNavigate } from 'umi';
import styles from '../themes/terminal.less';
import { AppProvider, useApp } from '../contexts/appContext';
import { SqlConfigProvider } from '../contexts/SqlConfigContext';
import NoticeDropdown from '../components/NoticeDropdown';
import NoticeModal from '../components/NoticeModal';

const LayoutShell = () => {
  const { session, loading, sessionChecked, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    if (!sessionChecked) {
      return;
    }
    if (!session && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [location.pathname, navigate, session, sessionChecked]);

  useEffect(() => {
    if (!session) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setMessagesLoading(true);
      try {
        const data = await request('/notices');
        if (!cancelled) {
          setMessages(Array.isArray(data?.messages) ? data.messages : []);
        }
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

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
            <>
              <NoticeDropdown
                messages={messages}
                disabled={messagesLoading || messages.length === 0}
                onSelectMessage={(msg) => {
                  setActiveMessage(msg);
                  setMessageModalOpen(true);
                  if (msg?.id) {
                    request(`/notices/${msg.id}/read`, { method: 'POST' })
                      .then((data) => {
                        const readAt = data?.readAt;
                        setMessages((prev) =>
                          prev.map((item) =>
                            item.id === msg.id ? { ...item, read: true, readAt: readAt || item.readAt } : item,
                          ),
                        );
                      })
                      .catch(() => {});
                  }
                }}
              />
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
            </>
          ) : (
            <span className={styles.sessionText}>Not signed in</span>
          )}
        </div>
      </header>
      <main className={styles.content}>
        <Outlet />
      </main>

      <NoticeModal
        open={messageModalOpen}
        title={activeMessage?.title}
        body={activeMessage?.body}
        footer={activeMessage?.footer}
        onCancel={() => {
          setMessageModalOpen(false);
          setActiveMessage(null);
        }}
      />
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
