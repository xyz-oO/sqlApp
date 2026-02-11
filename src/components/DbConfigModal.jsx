import TerminalTextInput from './TerminalTextInput';
import TerminalPasswordInput from './TerminalPasswordInput';
import styles from '../themes/terminal.less';

export default function DbConfigModal({
  open,
  host,
  database,
  port,
  username,
  password,
  onHostChange,
  onDatabaseChange,
  onPortChange,
  onUsernameChange,
  onPasswordChange,
  onCancel,
  onSave,
  onTest,
  saving,
  error,
  testResult,
}) {

  if (!open) {
    return null;
  }

  return (
    <div className={styles.terminalModalOverlay} onClick={onCancel}>
      <div
        className={styles.terminalModalCard}
        onClick={(event) => event.stopPropagation()}
        style={{ width: '600px' }}
      >
        <div className={styles.terminalModalHeader}>
          <span>数据库连接配置</span>
          <button className={styles.terminalModalClose} type="button" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className={styles.terminalModalBody}>
          <div style={{ margin: '24px 0' }}>
            <label>Host</label>
            <TerminalTextInput
              value={host}
              onChange={onHostChange}
              placeholder="IP"
              style={{width:"560px"}}
              autoFocus
            />
          </div>
          <div style={{ margin: '24px 0' }}>
            <label>Database</label>
            <TerminalTextInput
              value={database}
              onChange={onDatabaseChange}
              placeholder="数据库名"
            />
          </div>
          <div style={{ margin: '24px 0' }}>
            <label>Port</label>
            <TerminalTextInput
              value={port}
              onChange={onPortChange}
              placeholder="端口"
            />
          </div>
          <div style={{ margin: '24px 0' }}>
            <label>Username</label>
            <TerminalTextInput
              value={username}
              onChange={onUsernameChange}
              placeholder="用户名"
            />
          </div>
          <div style={{ margin: '24px 0' }}>
            <label>Password</label>
            <TerminalPasswordInput
              value={password}
              onChange={onPasswordChange}
              placeholder="密码"
            />
          </div>
          {error ? <div style={{ marginTop: 8, color: '#ff9a9a'}}>{error}</div> : null}
        </div>
        <div className={styles.terminalModalFooter}>
          <button
            className={styles.terminalButton}
            type="button"
            onClick={onTest}
            disabled={saving}
          >
            Test
          </button>
          {/* <button
            className={styles.terminalButton}
            type="button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button> */}
          <button
            className={styles.terminalPrimaryButton}
            type="button"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : '保存'}
          </button>
        </div>
        {testResult ? (
          <div style={{ padding: '0 16px 16px', color: testResult.ok ? '#00ff00' : '#ff9a9a' }}>
            {testResult.message}
          </div>
        ) : null}
      </div>
    </div>
  );
}

