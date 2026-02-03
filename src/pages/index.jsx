import { useEffect, useState } from 'react';
import { useNavigate } from 'umi';
import { useApp } from '../contexts/appContext';
import styles from '../themes/terminal.less';

export default function HomePage() {
  const [formState, setFormState] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { session, login, logout, loading } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.sessionId) {
      navigate(`/${session.sessionId}`);
    }
  }, [navigate, session]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!formState.username.trim() || !formState.password.trim()) {
      setError('Enter both username and password.');
      return;
    }
    try {
      const nextSession = await login({
        username: formState.username.trim(),
        password: formState.password,
      });
      setFormState({ username: '', password: '' });
      if (nextSession?.sessionId) {
        navigate(`/${nextSession.sessionId}`);
      }
    } catch (error) {
      setError(error?.message || 'Login failed.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>login@terminal</h2>
          <p>Authenticate to start a session.</p>
        </div>
        <div className={styles.terminal}>
          <div className={styles.prompt}>
            <span>user@login-app</span>
            <span>:</span>
            <span>~</span>
            <span>$</span>
            <span>{session ? 'whoami' : 'login'}</span>
          </div>
          {session ? (
            <div className={styles.sessionCard}>
              <div className={styles.sessionRow}>
                <span>signed-in-user</span>
                <strong>{session.username}</strong>
              </div>
              <div className={styles.sessionRow}>
                <span>session-id</span>
                <code>{session.sessionId}</code>
              </div>
              <div className={styles.sessionRow}>
                <span>login-time</span>
                <span>{new Date(session.loginAt).toLocaleString()}</span>
              </div>
              <button className={styles.secondaryButton} onClick={logout} type="button">
                logout
              </button>
              <div className={styles.hint}>Hint: session expires when backend invalidates it.</div>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                username
                <input
                  name="username"
                  value={formState.username}
                  onChange={handleChange}
                  placeholder="username"
                  autoComplete="username"
                />
              </label>
              <label className={styles.field}>
                password
                <input
                  name="password"
                  value={formState.password}
                  onChange={handleChange}
                  type="password"
                  placeholder="password"
                  autoComplete="current-password"
                />
              </label>
              {error ? <div className={styles.error}>{error}</div> : null}
              <button className={styles.primaryButton} type="submit" disabled={loading}>
                {loading ? 'authenticating...' : 'start-session'}
              </button>
              <div className={styles.hint}>Use your backend credentials once available.</div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
