import { Input, Typography } from 'antd';
import styles from '../themes/terminal.less';

const { Text } = Typography;

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
      >
        <div className={styles.terminalModalHeader}>
          <span>数据库连接配置</span>
          <button className={styles.terminalModalClose} type="button" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className={styles.terminalModalBody}>
          <div className={styles.terminalModalField}>
            <Text>Host</Text>
            <Input
              value={host}
              onChange={(event) => onHostChange(event.target.value)}
              placeholder="IP"
              autoFocus
              size="large"
              disabled={false}
              spellCheck={false}
            />
          </div>
          <div className={styles.terminalModalField}>
            <Text>Database</Text>
            <Input
              value={database}
              onChange={(event) => onDatabaseChange(event.target.value)}
              placeholder="数据库名"
              size="large"
              disabled={false}
              spellCheck={false}
            />
          </div>
          <div className={styles.terminalModalField}>
            <Text>Port</Text>
            <Input
              value={port}
              onChange={(event) => onPortChange(event.target.value)}
              placeholder="端口"
              size="large"
              disabled={false}
              spellCheck={false}
            />
          </div>
          <div className={styles.terminalModalField}>
            <Text>Username</Text>
            <Input
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              placeholder="用户名"
              size="large"
              disabled={false}
              spellCheck={false}
            />
          </div>
          <div className={styles.terminalModalField}>
            <Text>Password</Text>
            <Input.Password
              value={password}
              size="large"
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="密码"
              disabled={false}
              spellCheck={false}
              iconRender={(visible) => (
                <span style={{ fontSize: '20px' }}>{visible ? '👁️':'🙈' }</span>
              )}
            />
          </div>
          {error ? <div style={{ marginTop: 8, color: '#ff9a9a' }}>{error}</div> : null}
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
          <div style={{ padding: '0 16px 16px', color: testResult.ok ? '#8dff9d' : '#ff9a9a' }}>
            {testResult.message}
          </div>
        ) : null}
      </div>
    </div>
  );
}

